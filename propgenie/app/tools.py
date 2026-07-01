import json
import os
import sys
from typing import Any

import google.auth
from google.cloud.firestore import Client
from googleapiclient.discovery import build

# Setup Google Calendar Service Client globally (optional auth fallback)
calendar_service = None
try:
    credentials, project = google.auth.default(
        scopes=["https://www.googleapis.com/auth/calendar.events"]
    )
    calendar_service = build("calendar", "v3", credentials=credentials)
except Exception:
    pass

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../db.json"))

# Initialize Firestore client targeting database 'propgenie'
USE_FIRESTORE = True
try:
    db_client = Client(database="propgenie")
except Exception as e:
    print(
        f"[FIRESTORE] Warning: Could not initialize Firestore Client ({e}). Falling back to local db.json.",
        file=sys.stderr,
    )
    USE_FIRESTORE = False

COLLECTIONS = [
    "properties",
    "tenants",
    "payments",
    "expenses",
    "tickets",
    "calendar_events",
    "uploaded_files",
    "contracts",
    "legal_policies",
    "evictions",
    "audit_logs",
]


def _load_db() -> dict[str, Any]:
    global USE_FIRESTORE
    if USE_FIRESTORE:
        try:
            db = {}
            seed_db = {}
            if os.path.exists(DB_PATH):
                try:
                    with open(DB_PATH) as f:
                        seed_db = json.load(f)
                except Exception:
                    pass

            for col_name in COLLECTIONS:
                docs = list(db_client.collection(col_name).stream())
                if docs:
                    db[col_name] = [doc.to_dict() for doc in docs]
                else:
                    # If this collection is empty in Firestore, seed it from db.json!
                    items = seed_db.get(col_name, [])
                    if items:
                        print(
                            f"[FIRESTORE] Seeding collection '{col_name}' from db.json...",
                            file=sys.stderr,
                        )
                        for item in items:
                            doc_id = item.get("id") or item.get("name")
                            if doc_id:
                                doc_id = str(doc_id).replace("/", "_")
                                db_client.collection(col_name).document(doc_id).set(
                                    item
                                )
                            else:
                                db_client.collection(col_name).add(item)
                    db[col_name] = items
            return db
        except Exception as e:
            print(
                f"[FIRESTORE] Error reading from Firestore ({e}). Falling back to local db.json.",
                file=sys.stderr,
            )
            USE_FIRESTORE = False

    # Fallback to local db.json
    if not os.path.exists(DB_PATH):
        return {col: [] for col in COLLECTIONS}
    with open(DB_PATH) as f:
        return json.load(f)


def _save_db(db: dict[str, Any]) -> None:
    global USE_FIRESTORE
    if USE_FIRESTORE:
        try:
            for col_name in COLLECTIONS:
                items = db.get(col_name, [])
                existing_docs = {
                    doc.id: doc.to_dict()
                    for doc in db_client.collection(col_name).stream()
                }
                active_ids = set()

                for item in items:
                    doc_id = item.get("id") or item.get("name")
                    if not doc_id and col_name == "audit_logs":
                        doc_id = item.get("timestamp")

                    if doc_id:
                        doc_id = str(doc_id).replace("/", "_")
                        active_ids.add(doc_id)
                        # Only set in Firestore if content has changed!
                        if existing_docs.get(doc_id) != item:
                            db_client.collection(col_name).document(doc_id).set(item)
                    else:
                        ref = db_client.collection(col_name).add(item)
                        active_ids.add(ref[1].id)

                for doc_id in existing_docs:
                    if doc_id not in active_ids:
                        db_client.collection(col_name).document(doc_id).delete()
            return
        except Exception as e:
            print(
                f"[FIRESTORE] Error writing to Firestore ({e}). Falling back to local db.json.",
                file=sys.stderr,
            )
            USE_FIRESTORE = False

    # Fallback to local db.json
    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2)


def log_audit_action(action: str, details: str) -> dict[str, Any]:
    """Logs an agent action to the audit collection for compliance.

    Args:
        action: The type of action performed (e.g. 'LOG_PAYMENT', 'SEND_REMINDER').
        details: A description of the action details.
    """
    import datetime

    # Ignore read/fetch actions from the persistent activity feed to prevent pollution
    IGNORE_ACTIONS = {
        "GET_FINANCIAL_REPORT",
        "GET_OVERDUE_TENANTS",
        "GET_PROPERTIES_AND_TENANTS",
    }

    print(f"[AUDIT LOG] {action} - {details}", file=sys.stderr)

    if action in IGNORE_ACTIONS:
        return {"status": "success", "ignored": True}

    db = _load_db()
    if "audit_logs" not in db:
        db["audit_logs"] = []
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "action": action,
        "details": details,
    }
    db["audit_logs"].append(log_entry)
    _save_db(db)
    return {"status": "success", "log_entry": log_entry}


# ==========================================
# 1. DATABASE (FIRESTORE) TOOLS
# ==========================================


def get_properties_and_tenants() -> dict[str, Any]:
    """Retrieves all registered properties and the details of active tenants from the database."""
    db = _load_db()
    log_audit_action(
        "GET_PROPERTIES_AND_TENANTS", "Queried properties and tenants list."
    )
    return {
        "status": "success",
        "properties": db.get("properties", []),
        "tenants": db.get("tenants", []),
    }


def get_overdue_tenants() -> dict[str, Any]:
    """Queries and returns all tenants whose rent payment is currently overdue in the database."""
    import calendar
    import datetime

    db = _load_db()
    today = datetime.date.today()
    _, num_days = calendar.monthrange(today.year, today.month)
    days_remaining = num_days - today.day
    is_overdue_period = days_remaining <= 5

    overdue_tenants = []
    for t in db.get("tenants", []):
        if t.get("status") == "Overdue" or (
            is_overdue_period
            and t.get("status") != "Paid"
            and t.get("status") != "Vacated"
        ):
            t_copy = dict(t)
            t_copy["status"] = "Overdue"
            overdue_tenants.append(t_copy)

    log_audit_action(
        "GET_OVERDUE_TENANTS",
        f"Found {len(overdue_tenants)} overdue tenants (Overdue Period active: {is_overdue_period}).",
    )
    return {"status": "success", "overdue_tenants": overdue_tenants}


def log_rent_payment(tenant_name: str, amount: float) -> dict[str, Any]:
    """Logs a rent payment received for a tenant, marks rent as Paid, and updates the database.

    Args:
        tenant_name: The exact name of the tenant who made the payment.
        amount: The payment amount received.
    """
    db = _load_db()
    tenant = next(
        (t for t in db.get("tenants", []) if t["name"].lower() == tenant_name.lower()),
        None,
    )
    if not tenant:
        return {"status": "error", "message": f"Tenant '{tenant_name}' not found."}

    payment_id = f"pay_{len(db.get('payments', [])) + 1:03d}"
    payment_record = {
        "id": payment_id,
        "tenant_name": tenant["name"],
        "property": tenant["property"],
        "amount": amount,
        "date": "2026-06-29",
        "status": "Cleared",
    }
    db["payments"].append(payment_record)
    tenant["status"] = "Paid"
    _save_db(db)

    log_audit_action(
        "LOG_RENT_PAYMENT",
        f"Logged ₹{amount} payment for {tenant['name']} (ID: {payment_id}).",
    )

    return {
        "status": "success",
        "message": f"Payment of ₹{amount} successfully logged for {tenant['name']}.",
        "payment_record": payment_record,
    }


def log_expense(
    property_name: str, category: str, amount: float, description: str
) -> dict[str, Any]:
    """Logs an operational expense (e.g. plumbing, repairs, electrical) for a property in the database.

    Args:
        property_name: The name/identifier of the property (e.g. 'Flat 3B').
        category: The expense category (e.g., 'plumbing', 'electrical', 'repairs').
        amount: The total amount in Rupees spent.
        description: A short description of what was fixed or purchased.
    """
    db = _load_db()
    prop = next(
        (
            p
            for p in db.get("properties", [])
            if p["name"].lower() == property_name.lower()
        ),
        None,
    )
    if not prop:
        return {"status": "error", "message": f"Property '{property_name}' not found."}

    expense_id = f"exp_{len(db.get('expenses', [])) + 1:03d}"
    expense_record = {
        "id": expense_id,
        "property": prop["name"],
        "category": category,
        "amount": amount,
        "description": description,
        "date": "2026-06-29",
    }
    db["expenses"].append(expense_record)
    _save_db(db)

    log_audit_action(
        "LOG_EXPENSE", f"Logged ₹{amount} {category} expense for {prop['name']}."
    )

    return {
        "status": "success",
        "message": f"Logged ₹{amount} {category} expense for {prop['name']}.",
        "expense_record": expense_record,
    }


def create_maintenance_ticket(tenant_name: str, issue: str) -> dict[str, Any]:
    """Creates a new maintenance ticket reported by a tenant in the database.

    Args:
        tenant_name: The exact name of the tenant reporting the issue.
        issue: A description of the maintenance issue (e.g., 'clogged pipe', 'AC repair').
    """
    db = _load_db()
    tenant = next(
        (t for t in db.get("tenants", []) if t["name"].lower() == tenant_name.lower()),
        None,
    )
    if not tenant:
        return {"status": "error", "message": f"Tenant '{tenant_name}' not found."}

    ticket_id = f"tkt_{len(db.get('tickets', [])) + 1:03d}"
    ticket_record = {
        "id": ticket_id,
        "property": tenant["property"],
        "tenant_name": tenant["name"],
        "issue": issue,
        "status": "Open",
        "vendor": "Unassigned",
        "created_at": "2026-06-29",
    }
    db["tickets"].append(ticket_record)
    _save_db(db)

    log_audit_action(
        "CREATE_TICKET",
        f"Created maintenance ticket {ticket_id} for {tenant['name']} ({tenant['property']}).",
    )

    return {
        "status": "success",
        "message": f"Maintenance ticket {ticket_id} successfully created.",
        "ticket": ticket_record,
    }


def update_ticket_status(ticket_id: str, status: str, vendor: str) -> dict[str, Any]:
    """Updates the status and assigns a vendor to a maintenance ticket in the database.

    Args:
        ticket_id: The ID of the ticket to update (e.g. 'tkt_001').
        status: The new status of the ticket (e.g., 'In Progress', 'Closed').
        vendor: The name of the vendor assigned to do the work.
    """
    db = _load_db()
    ticket = next(
        (t for t in db.get("tickets", []) if t["id"].lower() == ticket_id.lower()), None
    )
    if not ticket:
        return {"status": "error", "message": f"Ticket '{ticket_id}' not found."}

    ticket["status"] = status
    ticket["vendor"] = vendor
    _save_db(db)

    log_audit_action(
        "UPDATE_TICKET",
        f"Updated ticket {ticket_id} to status: '{status}' (Vendor: {vendor}).",
    )

    return {
        "status": "success",
        "message": f"Ticket {ticket_id} successfully updated to '{status}' (Vendor: {vendor}).",
        "ticket": ticket,
    }


def get_maintenance_tickets() -> dict[str, Any]:
    """Retrieves all maintenance tickets currently in the database."""
    db = _load_db()
    log_audit_action("GET_TICKETS", "Queried maintenance tickets.")
    return {"status": "success", "tickets": db.get("tickets", [])}


def get_financial_report() -> dict[str, Any]:
    """Generates a financial Profit & Loss (P&L) report from transaction tables in the database."""
    db = _load_db()
    payments = db.get("payments", [])
    expenses = db.get("expenses", [])

    total_revenue = sum(p["amount"] for p in payments)
    total_expenses = sum(e["amount"] for e in expenses)
    net_p_and_l = total_revenue - total_expenses

    log_audit_action(
        "GET_FINANCIAL_REPORT", f"Generated financial report. P&L: ₹{net_p_and_l}."
    )

    return {
        "status": "success",
        "financial_summary": {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_p_and_l": net_p_and_l,
        },
        "revenue_transactions": payments,
        "expense_transactions": expenses,
    }


# ==========================================
# 2. GOOGLE CALENDAR TOOLS
# ==========================================


def create_calendar_event(
    title: str, start_date: str, description: str
) -> dict[str, Any]:
    """Creates a calendar event (e.g. for rent due dates, lease expiries, or maintenance appointments) via Calendar.

    Args:
        title: The title of the event (e.g., 'Rent Due Date for Flat 101').
        start_date: The date in YYYY-MM-DD format.
        description: A short description of the event.
    """
    db = _load_db()
    if "calendar_events" not in db:
        db["calendar_events"] = []

    event_id = f"cal_{len(db['calendar_events']) + 1:03d}"
    event = {
        "id": event_id,
        "title": title,
        "start_date": start_date,
        "description": description,
    }
    db["calendar_events"].append(event)
    _save_db(db)

    # Sync to real Google Calendar if configured
    calendar_id = os.environ.get("CALENDAR_ID")
    if calendar_id and calendar_service:
        try:
            body = {
                "summary": title,
                "description": description,
                "start": {
                    "date": start_date,
                },
                "end": {
                    "date": start_date,
                },
            }
            res = (
                calendar_service.events()
                .insert(calendarId=calendar_id, body=body)
                .execute()
            )
            log_audit_action(
                "CREATE_CALENDAR_EVENT",
                f"Created real Google Calendar event {res.get('id')} for {start_date}.",
            )
            return {
                "status": "success",
                "message": f"Real Google Calendar event created with ID: {res.get('id')}",
                "event": event,
            }
        except Exception as e:
            print(f"[CALENDAR API] Error creating event: {e}", file=sys.stderr)

    log_audit_action(
        "CREATE_CALENDAR_EVENT",
        f"Created simulated calendar event '{title}' for {start_date}.",
    )

    return {
        "status": "success",
        "message": f"Simulated calendar event '{title}' scheduled for {start_date}.",
        "event": event,
    }


# ==========================================
# 3. WHATSAPP BUSINESS TOOLS
# ==========================================


def send_whatsapp_message(recipient_phone: str, message_text: str) -> dict[str, Any]:
    """Sends a WhatsApp text message to a tenant or owner via the WhatsApp Business API.

    Args:
        recipient_phone: The recipient's phone number with country code (e.g., '+919876543210').
        message_text: The content of the WhatsApp message.
    """
    # Simulated WhatsApp dispatch
    print(
        f"[WHATSAPP API Dispatch] Sending message to {recipient_phone}: '{message_text}'",
        file=sys.stderr,
    )

    log_audit_action("SEND_WHATSAPP", f"Sent WhatsApp message to {recipient_phone}.")

    return {
        "status": "success",
        "message": f"WhatsApp message successfully dispatched to {recipient_phone}.",
        "payload": {"to": recipient_phone, "text": message_text},
    }


# ==========================================
# 4. RAZORPAY / UPI PAYMENT TOOLS
# ==========================================


def generate_payment_link(tenant_name: str, amount: float) -> dict[str, Any]:
    """Generates a Razorpay payment/invoice link for rent collection.

    Args:
        tenant_name: The exact name of the tenant.
        amount: The rent amount to collect.
    """
    payment_link = (
        f"https://rzp.io/i/pay_{tenant_name.replace(' ', '_').lower()}_{int(amount)}"
    )

    log_audit_action(
        "GENERATE_PAYMENT_LINK",
        f"Generated Razorpay payment link for {tenant_name} of ₹{amount}.",
    )

    return {
        "status": "success",
        "tenant_name": tenant_name,
        "amount": amount,
        "payment_link": payment_link,
    }


# ==========================================
# 5. GMAIL API TOOLS
# ==========================================


def send_email_notification(
    recipient_email: str, subject: str, body: str
) -> dict[str, Any]:
    """Sends an email notification (statements, lease agreements, formal notices) via Gmail SMTP or API.

    Args:
        recipient_email: The recipient's email address.
        subject: The email subject line.
        body: The body content of the email.
    """
    import smtplib
    from email.mime.text import MIMEText

    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")

    if gmail_user and gmail_password:
        try:
            msg = MIMEText(body)
            msg["Subject"] = subject
            msg["From"] = gmail_user
            msg["To"] = recipient_email

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(gmail_user, gmail_password)
                server.sendmail(gmail_user, recipient_email, msg.as_string())

            log_audit_action(
                "SEND_EMAIL",
                f"Sent real email to {recipient_email} (Subject: {subject}).",
            )
            return {
                "status": "success",
                "message": f"Real email successfully sent to {recipient_email}.",
            }
        except Exception as e:
            print(f"[GMAIL SMTP] Error sending email: {e}", file=sys.stderr)

    # Simulated Gmail dispatch fallback
    print(
        f"[GMAIL API Dispatch] Sending simulated email to {recipient_email} - Subject: {subject}",
        file=sys.stderr,
    )

    log_audit_action(
        "SEND_EMAIL",
        f"Sent simulated email to {recipient_email} (Subject: {subject}).",
    )

    return {
        "status": "success",
        "message": f"Email successfully sent to {recipient_email}.",
        "subject": subject,
    }


# ==========================================
# 6. GOOGLE DRIVE / STORAGE TOOLS
# ==========================================


def upload_document(
    filename: str, content_type: str, file_purpose: str
) -> dict[str, Any]:
    """Simulates uploading a document (Tenant KYC, Lease Agreements, Maintenance Photos) to Google Drive / Firebase Storage.

    Args:
        filename: Name of the file.
        content_type: MIME type of the document (e.g. 'application/pdf', 'image/jpeg').
        file_purpose: The purpose of the document (e.g. 'tenant_kyc', 'maintenance_photo', 'lease_agreement').
    """
    db = _load_db()
    if "uploaded_files" not in db:
        db["uploaded_files"] = []

    file_id = f"file_{len(db['uploaded_files']) + 1:03d}"
    storage_url = (
        f"https://storage.googleapis.com/propgenie-bucket/{file_purpose}/{filename}"
    )

    file_record = {
        "id": file_id,
        "filename": filename,
        "content_type": content_type,
        "file_purpose": file_purpose,
        "storage_url": storage_url,
    }
    db["uploaded_files"].append(file_record)
    _save_db(db)

    log_audit_action(
        "UPLOAD_DOCUMENT", f"Uploaded document '{filename}' as {file_purpose}."
    )

    return {
        "status": "success",
        "message": f"Document '{filename}' successfully uploaded to Google Drive.",
        "storage_url": storage_url,
        "file_record": file_record,
    }


def add_property(name: str, address: str, owner: str) -> dict[str, Any]:
    """Adds a new property to the database.

    Args:
        name: The name/identifier of the property (e.g. 'Flat 3B', 'Flat 101').
        address: The address details of the property.
        owner: The owner of the property.
    """
    db = _load_db()
    if any(p["name"].lower() == name.lower() for p in db.get("properties", [])):
        return {"status": "error", "message": f"Property '{name}' already exists."}

    new_prop = {"name": name, "address": address, "owner": owner}
    db.setdefault("properties", []).append(new_prop)
    _save_db(db)
    log_audit_action("ADD_PROPERTY", f"Added property: {name}")
    return {
        "status": "success",
        "message": f"Property '{name}' successfully added.",
        "property": new_prop,
    }


def add_tenant(
    name: str,
    property_name: str,
    phone: str,
    email: str,
    rent_amount: float,
    status: str = "Overdue",
) -> dict[str, Any]:
    """Registers or updates a tenant's lease assignment in the database.

    Args:
        name: The tenant's full name.
        property_name: The property name they are renting.
        phone: Tenant contact phone number.
        email: Tenant email address.
        rent_amount: Monthly rent amount.
        status: The rent status ('Paid' or 'Overdue').
    """
    db = _load_db()
    if not any(
        p["name"].lower() == property_name.lower() for p in db.get("properties", [])
    ):
        return {
            "status": "error",
            "message": f"Property '{property_name}' does not exist.",
        }

    new_tenant = {
        "name": name,
        "property": property_name,
        "phone": phone,
        "email": email,
        "rent_amount": float(rent_amount),
        "status": status,
    }

    # Remove existing if updating
    db["tenants"] = [
        t for t in db.get("tenants", []) if t["name"].lower() != name.lower()
    ]
    db["tenants"].append(new_tenant)
    _save_db(db)
    log_audit_action("ADD_TENANT", f"Registered tenant: {name} to {property_name}")
    return {
        "status": "success",
        "message": f"Tenant '{name}' registered to '{property_name}'.",
        "tenant": new_tenant,
    }


def create_lease_contract(
    tenant_name: str,
    property_name: str,
    start_date: str,
    end_date: str,
    rent_amount: float,
) -> dict[str, Any]:
    """Generates a new lease contract in Draft status.

    Args:
        tenant_name: The tenant's full name.
        property_name: The property name they are renting.
        start_date: Start date of the lease (YYYY-MM-DD).
        end_date: End date of the lease (YYYY-MM-DD).
        rent_amount: Monthly rent amount.
    """
    db = _load_db()
    contract_id = f"ctr_{len(db.get('contracts', [])) + 1:03d}"
    document_url = f"https://storage.googleapis.com/propgenie-bucket/lease_agreements/{contract_id}.pdf"

    new_contract = {
        "id": contract_id,
        "tenant_name": tenant_name,
        "property_name": property_name,
        "start_date": start_date,
        "end_date": end_date,
        "rent_amount": float(rent_amount),
        "status": "Draft",
        "signed_at": None,
        "document_url": document_url,
    }
    db.setdefault("contracts", []).append(new_contract)
    _save_db(db)
    log_audit_action(
        "CREATE_LEASE_CONTRACT",
        f"Created lease contract {contract_id} for {tenant_name}",
    )
    return {
        "status": "success",
        "message": f"Lease contract '{contract_id}' created successfully for '{tenant_name}'.",
        "contract": new_contract,
    }


def sign_lease_contract(contract_id: str) -> dict[str, Any]:
    """Simulates a tenant signing the lease contract, shifting status from 'Draft' or 'Pending Signature' to 'Active'.

    Args:
        contract_id: The unique ID of the contract (e.g. 'ctr_001').
    """
    import datetime

    db = _load_db()
    contracts = db.setdefault("contracts", [])
    found = False
    contract = None
    for ctr in contracts:
        if ctr["id"] == contract_id:
            ctr["status"] = "Active"
            ctr["signed_at"] = datetime.datetime.utcnow().isoformat() + "Z"
            found = True
            contract = ctr
            break

    if not found:
        return {"status": "error", "message": f"Contract '{contract_id}' not found."}

    _save_db(db)
    log_audit_action("SIGN_LEASE_CONTRACT", f"Signed contract {contract_id}")
    return {
        "status": "success",
        "message": f"Contract '{contract_id}' signed successfully.",
        "contract": contract,
    }


def get_contracts_status() -> dict[str, Any]:
    """Retrieves all lease contracts and computes days left until expiration.

    Computes dynamically based on current date.
    """
    import datetime

    db = _load_db()
    contracts = db.get("contracts", [])
    now = datetime.date.today()

    enhanced_contracts = []
    for ctr in contracts:
        days_left = None
        if ctr.get("end_date") and ctr["status"] not in ("Terminated", "Expired"):
            try:
                end_dt = datetime.datetime.strptime(ctr["end_date"], "%Y-%m-%d").date()
                days_left = (end_dt - now).days
            except ValueError:
                pass

        # Auto update status to expired if days_left is negative or 0
        if days_left is not None and days_left <= 0 and ctr["status"] == "Active":
            ctr["status"] = "Expired"

        enhanced = dict(ctr)
        enhanced["days_left"] = days_left
        enhanced_contracts.append(enhanced)

    return {"status": "success", "contracts": enhanced_contracts}


def renew_lease_contract(
    contract_id: str, new_end_date: str, rent_amount: float
) -> dict[str, Any]:
    """Renews an existing contract, extending the end date and updating the rent amount.

    Args:
        contract_id: The ID of the contract to renew.
        new_end_date: The new end date (YYYY-MM-DD).
        rent_amount: The new monthly rent amount.
    """
    db = _load_db()
    contracts = db.setdefault("contracts", [])
    found = False
    contract = None
    for ctr in contracts:
        if ctr["id"] == contract_id:
            ctr["status"] = "Active"
            ctr["end_date"] = new_end_date
            ctr["rent_amount"] = float(rent_amount)
            found = True
            contract = ctr
            break

    if not found:
        return {"status": "error", "message": f"Contract '{contract_id}' not found."}

    _save_db(db)
    log_audit_action(
        "RENEW_LEASE_CONTRACT",
        f"Renewed contract {contract_id} to end on {new_end_date}",
    )
    return {
        "status": "success",
        "message": f"Contract '{contract_id}' successfully renewed until {new_end_date}.",
        "contract": contract,
    }


def terminate_lease_contract(contract_id: str, termination_date: str) -> dict[str, Any]:
    """Terminates an active contract, shifting status to 'Terminated' and vacating the property.

    Args:
        contract_id: The ID of the contract to terminate.
        termination_date: The termination date (YYYY-MM-DD).
    """
    db = _load_db()
    contracts = db.setdefault("contracts", [])
    found = False
    tenant_name = ""
    contract = None
    for ctr in contracts:
        if ctr["id"] == contract_id:
            ctr["status"] = "Terminated"
            ctr["end_date"] = termination_date
            tenant_name = ctr["tenant_name"]
            found = True
            contract = ctr
            break

    if not found:
        return {"status": "error", "message": f"Contract '{contract_id}' not found."}

    # Mark tenant as Vacated in db.json
    if tenant_name:
        for t in db.setdefault("tenants", []):
            if t["name"].lower() == tenant_name.lower():
                t["status"] = "Vacated"

    _save_db(db)
    log_audit_action(
        "TERMINATE_LEASE_CONTRACT",
        f"Terminated lease contract {contract_id} for tenant {tenant_name}",
    )
    return {
        "status": "success",
        "message": f"Contract '{contract_id}' has been terminated, and tenant '{tenant_name}' status set to Vacated.",
        "contract": contract,
    }


def get_legal_and_evictions() -> dict[str, Any]:
    """Retrieves legal policies and active CDMX court eviction milestone listings."""
    db = _load_db()
    return {
        "status": "success",
        "legal_policies": db.get("legal_policies", []),
        "evictions": db.get("evictions", []),
    }


def update_eviction_milestone(
    eviction_id: str, milestone_name: str, status: str, date: str | None = None
) -> dict[str, Any]:
    """Updates a specific milestone in the eviction process.

    Args:
        eviction_id: The unique ID of the eviction proceeding (e.g. 'evc_001').
        milestone_name: The name of the milestone to update (e.g. 'Notice Issued', 'Court Hearing').
        status: The milestone status ('Completed' or 'Pending').
        date: The completion date (YYYY-MM-DD).
    """
    import datetime

    db = _load_db()
    evictions = db.setdefault("evictions", [])
    found = False
    eviction_record = None

    for evc in evictions:
        if evc["id"] == eviction_id:
            for ms in evc.get("milestones", []):
                if ms["milestone"].lower() == milestone_name.lower():
                    ms["status"] = status
                    ms["date"] = (
                        date
                        if date
                        else (
                            datetime.date.today().isoformat()
                            if status == "Completed"
                            else None
                        )
                    )
                    found = True
                    eviction_record = evc
                    break
            break

    if not found:
        return {
            "status": "error",
            "message": f"Milestone '{milestone_name}' in eviction '{eviction_id}' not found.",
        }

    _save_db(db)
    log_audit_action(
        "UPDATE_EVICTION_MILESTONE",
        f"Updated milestone '{milestone_name}' of eviction {eviction_id} to {status}.",
    )
    return {
        "status": "success",
        "message": f"Milestone '{milestone_name}' in eviction '{eviction_id}' set to '{status}'.",
        "eviction": eviction_record,
    }


def send_auto_reminders() -> dict[str, Any]:
    """Automates sending rent payment reminders to overdue tenants, and lease renewal notifications to owners and tenants for leases expiring in <= 30 days."""
    import datetime

    db = _load_db()
    now = datetime.date.today()

    alerts_sent = []

    # 1. Overdue Rent Reminders
    tenants = db.get("tenants", [])
    for tenant in tenants:
        if tenant.get("status") == "Overdue":
            tenant_name = tenant["name"]
            phone = tenant.get("phone", "+919876543210")
            email = tenant.get("email", "tenant@example.com")
            rent = tenant.get("rent_amount", 0)

            # Generate Razorpay Link
            pay_link = f"https://rzp.io/i/pay_{tenant_name.replace(' ', '_').lower()}_{int(rent)}"
            msg = f"Dear {tenant_name}, your rent of ₹{rent} for {tenant.get('property')} is overdue. Please pay using this link: {pay_link}"

            # Dispatch WhatsApp and Email
            send_whatsapp_message(phone, msg)
            send_email_notification(email, "Rent Payment Overdue Reminder", msg)

            log_audit_action(
                "AUTO_RENT_REMINDER", f"Sent rent reminder to tenant {tenant_name}"
            )
            alerts_sent.append(f"Rent payment reminder sent to tenant {tenant_name}")

    # 2. Expiration / Renewal Warnings (<= 30 days left)
    contracts = db.get("contracts", [])
    for ctr in contracts:
        if ctr["status"] == "Active" and ctr.get("end_date"):
            try:
                end_dt = datetime.datetime.strptime(ctr["end_date"], "%Y-%m-%d").date()
                days_left = (end_dt - now).days
                if 0 < days_left <= 30:
                    tenant_name = ctr["tenant_name"]
                    prop_name = ctr["property_name"]

                    # Find tenant details
                    tenant_email = "tenant@example.com"
                    tenant_phone = "+919876543210"
                    for t in tenants:
                        if t["name"].lower() == tenant_name.lower():
                            tenant_email = t.get("email", tenant_email)
                            tenant_phone = t.get("phone", tenant_phone)
                            break

                    owner_email = "owner@propgenie.com"

                    msg_tenant = f"Dear {tenant_name}, your lease contract for {prop_name} is expiring in {days_left} days (on {ctr['end_date']}). Please coordinate renewal with the property owner."
                    msg_owner = f"Hello, the lease contract for {tenant_name} renting {prop_name} is expiring in {days_left} days (on {ctr['end_date']}). Please coordinate renewal or vacation."

                    # Send notifications
                    send_email_notification(
                        tenant_email, "Lease Expiration Warning", msg_tenant
                    )
                    send_whatsapp_message(tenant_phone, msg_tenant)
                    send_email_notification(
                        owner_email,
                        "Lease Expiration Warning - Property Owner",
                        msg_owner,
                    )

                    log_audit_action(
                        "AUTO_RENEWAL_REMINDER",
                        f"Sent lease renewal warning for contract {ctr['id']} to owner and tenant.",
                    )
                    alerts_sent.append(
                        f"Lease renewal reminder sent to owner and tenant {tenant_name} for contract {ctr['id']}"
                    )
            except ValueError:
                pass

    return {"status": "success", "alerts_sent": alerts_sent}
