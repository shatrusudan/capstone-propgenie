from typing import Any

from fastmcp import FastMCP

from app import tools

mcp = FastMCP("PropGenie MCP Server")


@mcp.tool
def get_properties_and_tenants() -> dict[str, Any]:
    """Retrieves all registered properties and the details of active tenants from the database."""
    return tools.get_properties_and_tenants()


@mcp.tool
def get_overdue_tenants() -> dict[str, Any]:
    """Queries and returns all tenants whose rent payment is currently overdue in the database."""
    return tools.get_overdue_tenants()


@mcp.tool
def log_rent_payment(tenant_name: str, amount: float) -> dict[str, Any]:
    """Logs a rent payment received for a tenant, marks rent as Paid, and updates the database.

    Args:
        tenant_name: The exact name of the tenant who made the payment.
        amount: The payment amount received.
    """
    return tools.log_rent_payment(tenant_name, amount)


@mcp.tool
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
    return tools.log_expense(property_name, category, amount, description)


@mcp.tool
def create_maintenance_ticket(tenant_name: str, issue: str) -> dict[str, Any]:
    """Creates a new maintenance ticket reported by a tenant in the database.

    Args:
        tenant_name: The exact name of the tenant reporting the issue.
        issue: A description of the maintenance issue (e.g., 'clogged pipe', 'AC repair').
    """
    return tools.create_maintenance_ticket(tenant_name, issue)


@mcp.tool
def update_ticket_status(ticket_id: str, status: str, vendor: str) -> dict[str, Any]:
    """Updates the status and assigns a vendor to a maintenance ticket in the database.

    Args:
        ticket_id: The ID of the ticket to update (e.g. 'tkt_001').
        status: The new status of the ticket (e.g., 'In Progress', 'Closed').
        vendor: The name of the vendor assigned to do the work.
    """
    return tools.update_ticket_status(ticket_id, status, vendor)


@mcp.tool
def get_maintenance_tickets() -> dict[str, Any]:
    """Retrieves all maintenance tickets currently in the database."""
    return tools.get_maintenance_tickets()


@mcp.tool
def get_financial_report() -> dict[str, Any]:
    """Generates a financial Profit & Loss (P&L) report from transaction tables in the database."""
    return tools.get_financial_report()


@mcp.tool
def create_calendar_event(
    title: str, start_date: str, description: str
) -> dict[str, Any]:
    """Creates a calendar event (e.g. for rent due dates, lease expiries, or maintenance appointments) via Calendar.

    Args:
        title: The title of the event.
        start_date: The date in YYYY-MM-DD format.
        description: A short description of the event.
    """
    return tools.create_calendar_event(title, start_date, description)


@mcp.tool
def send_whatsapp_message(recipient_phone: str, message_text: str) -> dict[str, Any]:
    """Sends a WhatsApp text message to a tenant or owner via the WhatsApp Business API.

    Args:
        recipient_phone: The recipient's phone number with country code.
        message_text: The content of the WhatsApp message.
    """
    return tools.send_whatsapp_message(recipient_phone, message_text)


@mcp.tool
def generate_payment_link(tenant_name: str, amount: float) -> dict[str, Any]:
    """Generates a Razorpay payment/invoice link for rent collection.

    Args:
        tenant_name: The exact name of the tenant.
        amount: The rent amount to collect.
    """
    return tools.generate_payment_link(tenant_name, amount)


@mcp.tool
def send_email_notification(
    recipient_email: str, subject: str, body: str
) -> dict[str, Any]:
    """Sends an email notification via the Gmail API.

    Args:
        recipient_email: The recipient's email address.
        subject: The email subject line.
        body: The body content of the email.
    """
    return tools.send_email_notification(recipient_email, subject, body)


@mcp.tool
def upload_document(
    filename: str, content_type: str, file_purpose: str
) -> dict[str, Any]:
    """Simulates uploading a document to Google Drive / Firebase Storage.

    Args:
        filename: Name of the file.
        content_type: MIME type of the document.
        file_purpose: The purpose of the document.
    """
    return tools.upload_document(filename, content_type, file_purpose)


@mcp.tool
def add_property(name: str, address: str, owner: str) -> dict[str, Any]:
    """Adds a new property to the database.

    Args:
        name: The name/identifier of the property (e.g. 'Flat 3B', 'Flat 101').
        address: The address details of the property.
        owner: The owner of the property.
    """
    return tools.add_property(name, address, owner)


@mcp.tool
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
    return tools.add_tenant(name, property_name, phone, email, rent_amount, status)


@mcp.tool
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
    return tools.create_lease_contract(
        tenant_name, property_name, start_date, end_date, rent_amount
    )


@mcp.tool
def sign_lease_contract(contract_id: str) -> dict[str, Any]:
    """Simulates a tenant signing the lease contract, shifting status to 'Active'.

    Args:
        contract_id: The unique ID of the contract (e.g. 'ctr_001').
    """
    return tools.sign_lease_contract(contract_id)


@mcp.tool
def get_contracts_status() -> dict[str, Any]:
    """Retrieves all lease contracts and computes days left until expiration."""
    return tools.get_contracts_status()


@mcp.tool
def renew_lease_contract(
    contract_id: str, new_end_date: str, rent_amount: float
) -> dict[str, Any]:
    """Renews an existing contract, extending the end date and updating the rent amount.

    Args:
        contract_id: The ID of the contract to renew.
        new_end_date: The new end date (YYYY-MM-DD).
        rent_amount: The new monthly rent amount.
    """
    return tools.renew_lease_contract(contract_id, new_end_date, rent_amount)


@mcp.tool
def terminate_lease_contract(contract_id: str, termination_date: str) -> dict[str, Any]:
    """Terminates an active contract, shifting status to 'Terminated' and vacating the property.

    Args:
        contract_id: The ID of the contract to terminate.
        termination_date: The termination date (YYYY-MM-DD).
    """
    return tools.terminate_lease_contract(contract_id, termination_date)


@mcp.tool
def get_legal_and_evictions() -> dict[str, Any]:
    """Retrieves legal policies and active CDMX court eviction milestone listings."""
    return tools.get_legal_and_evictions()


@mcp.tool
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
    return tools.update_eviction_milestone(eviction_id, milestone_name, status, date)


@mcp.tool
def send_auto_reminders() -> dict[str, Any]:
    """Automates sending rent payment reminders to overdue tenants, and lease renewal notifications to owners and tenants for leases expiring in <= 30 days."""
    return tools.send_auto_reminders()


if __name__ == "__main__":
    mcp.run()
