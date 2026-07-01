# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
import os
from typing import Any

import google.auth
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from google.adk.cli.fast_api import get_fast_api_app
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.cloud import logging as google_cloud_logging
from google.genai import types
from pydantic import BaseModel

from app.agent import root_agent
from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback
from app.tools import (
    _load_db,
    _save_db,
    create_lease_contract,
    create_maintenance_ticket,
    get_contracts_status,
    get_financial_report,
    get_legal_and_evictions,
    log_audit_action,
    renew_lease_contract,
    send_auto_reminders,
    send_whatsapp_message,
    sign_lease_contract,
    terminate_lease_contract,
    update_eviction_milestone,
    update_ticket_status,
)

setup_telemetry()
_, project_id = google.auth.default()
logging_client = google_cloud_logging.Client()
logger = logging_client.logger(__name__)
allow_origins = (
    os.getenv("ALLOW_ORIGINS", "").split(",") if os.getenv("ALLOW_ORIGINS") else ["*"]
)

# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# In-memory session configuration - no persistent storage
session_service_uri = None

artifact_service_uri = f"gs://{logs_bucket_name}" if logs_bucket_name else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=artifact_service_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
    otel_to_cloud=True,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.title = "propgenie"
app.description = "API for interacting with the Agent propgenie"


# Initialize the ADK runner and session service for the webhook & dashboard chat
session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service, app_name="app")


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    logger.log_struct(feedback.model_dump(), severity="INFO")
    return {"status": "success"}


# ==========================================
# Pydantic Schemas for Dashboard API
# ==========================================


class PropertyModel(BaseModel):
    name: str
    address: str
    owner: str


class TenantModel(BaseModel):
    name: str
    property: str
    phone: str
    email: str
    rent_amount: float
    status: str


class TicketModel(BaseModel):
    tenant_name: str
    issue: str


class TicketUpdateModel(BaseModel):
    ticket_id: str
    status: str
    vendor: str


class LeaseContractCreateModel(BaseModel):
    tenant_name: str
    property_name: str
    start_date: str
    end_date: str
    rent_amount: float


class LeaseContractRenewModel(BaseModel):
    new_end_date: str
    rent_amount: float


class LeaseContractTerminateModel(BaseModel):
    termination_date: str


class EvictionMilestoneUpdateModel(BaseModel):
    milestone_name: str
    status: str
    date: str | None = None


class ChatRequest(BaseModel):
    message: str
    phone: str = "+919876543210"
    session_id: str | None = None


# ==========================================
# REST API ENDPOINTS FOR DASHBOARD UI
# ==========================================


@app.get("/api/properties")
def get_properties() -> dict[str, Any]:
    db = _load_db()
    return {"status": "success", "properties": db.get("properties", [])}


@app.post("/api/properties")
def add_property(prop: PropertyModel) -> dict[str, Any]:
    db = _load_db()
    # Check if exists
    if any(p["name"].lower() == prop.name.lower() for p in db.get("properties", [])):
        raise HTTPException(status_code=400, detail="Property already exists.")

    new_prop = prop.model_dump()
    db["properties"].append(new_prop)
    _save_db(db)
    log_audit_action("ADD_PROPERTY", f"Added property: {prop.name}")
    return {"status": "success", "property": new_prop}


@app.get("/api/tenants")
def get_tenants() -> dict[str, Any]:
    db = _load_db()
    return {"status": "success", "tenants": db.get("tenants", [])}


@app.post("/api/tenants")
def add_tenant(tenant: TenantModel) -> dict[str, Any]:
    db = _load_db()
    # Check if property exists
    if not any(
        p["name"].lower() == tenant.property.lower() for p in db.get("properties", [])
    ):
        raise HTTPException(
            status_code=400, detail=f"Property '{tenant.property}' does not exist."
        )

    new_tenant = tenant.model_dump()
    # Remove existing tenant if updating
    db["tenants"] = [
        t for t in db.get("tenants", []) if t["name"].lower() != tenant.name.lower()
    ]
    db["tenants"].append(new_tenant)
    _save_db(db)
    log_audit_action(
        "ADD_TENANT", f"Added/Updated tenant: {tenant.name} for {tenant.property}"
    )
    return {"status": "success", "tenant": new_tenant}


@app.get("/api/tickets")
def get_tickets() -> dict[str, Any]:
    db = _load_db()
    return {"status": "success", "tickets": db.get("tickets", [])}


@app.post("/api/tickets")
def add_ticket(ticket: TicketModel) -> dict[str, Any]:
    res = create_maintenance_ticket(ticket.tenant_name, ticket.issue)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.post("/api/tickets/update")
def assign_ticket_vendor(update: TicketUpdateModel) -> dict[str, Any]:
    res = update_ticket_status(update.ticket_id, update.status, update.vendor)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.get("/api/financials")
def get_financials() -> dict[str, Any]:
    return get_financial_report()


@app.get("/api/contracts")
def get_all_contracts() -> dict[str, Any]:
    return get_contracts_status()


@app.post("/api/contracts")
def create_contract(ctr: LeaseContractCreateModel) -> dict[str, Any]:
    res = create_lease_contract(
        ctr.tenant_name,
        ctr.property_name,
        ctr.start_date,
        ctr.end_date,
        ctr.rent_amount,
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.post("/api/contracts/{contract_id}/sign")
def sign_contract(contract_id: str) -> dict[str, Any]:
    res = sign_lease_contract(contract_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.post("/api/contracts/{contract_id}/renew")
def renew_contract(
    contract_id: str, payload: LeaseContractRenewModel
) -> dict[str, Any]:
    res = renew_lease_contract(contract_id, payload.new_end_date, payload.rent_amount)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.post("/api/contracts/{contract_id}/terminate")
def terminate_contract(
    contract_id: str, payload: LeaseContractTerminateModel
) -> dict[str, Any]:
    res = terminate_lease_contract(contract_id, payload.termination_date)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.get("/api/legal")
def get_legal_data() -> dict[str, Any]:
    return get_legal_and_evictions()


@app.post("/api/evictions/{eviction_id}/milestones")
def update_eviction(
    eviction_id: str, payload: EvictionMilestoneUpdateModel
) -> dict[str, Any]:
    res = update_eviction_milestone(
        eviction_id, payload.milestone_name, payload.status, payload.date
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res


@app.post("/api/automation/run-reminders")
def run_automation_reminders() -> dict[str, Any]:
    return send_auto_reminders()


@app.get("/api/audit-logs")
def get_audit_logs() -> dict[str, Any]:
    db = _load_db()
    logs = db.get("audit_logs", [])
    try:
        # Sort descending by timestamp so latest acts appear first
        logs = sorted(logs, key=lambda x: x.get("timestamp", ""), reverse=True)
    except Exception:
        pass
    return {"status": "success", "audit_logs": logs}


@app.post("/api/chat")
async def chat_with_agent(req: ChatRequest) -> dict[str, Any]:
    """Exposes a REST endpoint for the Next.js Dashboard to converse with the PropGenie agents."""
    try:
        s_id = req.session_id if req.session_id else req.phone
        session = session_service.get_session_sync(
            user_id=req.phone, app_name="app", session_id=s_id
        )
        if not session:
            session = session_service.create_session_sync(
                user_id=req.phone, app_name="app", session_id=s_id
            )
        user_message = types.Content(
            role="user", parts=[types.Part.from_text(text=req.message)]
        )

        events = list(
            runner.run(
                new_message=user_message,
                user_id=req.phone,
                session_id=session.id,
            )
        )

        agent_response = ""
        for event in events:
            if (
                event.content
                and event.content.parts
                and any(part.text for part in event.content.parts)
            ):
                agent_response = "".join(
                    part.text for part in event.content.parts if part.text
                )

        return {
            "status": "success",
            "response": agent_response,
            "session_id": session.id,
        }
    except Exception as e:
        logger.exception("Error in agent chat endpoint: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


# ==========================================
# WHATSAPP WEBHOOK ENDPOINTS
# ==========================================


@app.get("/whatsapp/webhook")
def verify_whatsapp_webhook(request: Request) -> Any:
    """Verifies the webhook subscription with Meta's developer platform."""
    params = request.query_params
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN", "my_secret_token_123")

    if "hub.mode" in params and "hub.verify_token" in params:
        if (
            params["hub.mode"] == "subscribe"
            and params["hub.verify_token"] == verify_token
        ):
            print("WhatsApp Webhook Verified Successfully!")
            return int(params["hub.challenge"])
    raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/whatsapp/webhook")
async def receive_whatsapp_webhook(request: Request) -> dict[str, str]:
    """Handles incoming WhatsApp messages from Meta, runs them through the PropGenie coordinator,

    and sends back the response on WhatsApp.
    """
    try:
        payload = await request.json()

        # Parse message elements
        entry = payload["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]

        # Check if messages list exists (could be a status update payload)
        if "messages" not in value:
            return {"status": "ignored"}

        message = value["messages"][0]
        sender_phone = message["from"]  # Recipient phone (e.g. '+919876543210')

        if "text" not in message or "body" not in message["text"]:
            return {"status": "unsupported_message_type"}

        message_text = message["text"]["body"]  # Query/Prompt text

        # Start standard session for this sender's phone number
        session = session_service.create_session_sync(
            user_id=sender_phone, app_name="app"
        )

        user_message = types.Content(
            role="user", parts=[types.Part.from_text(text=message_text)]
        )

        # Run the agent synchronously over the runner
        events = list(
            runner.run(
                new_message=user_message,
                user_id=sender_phone,
                session_id=session.id,
            )
        )

        # Extract final textual output from the agent's events
        agent_response = ""
        for event in events:
            if (
                event.content
                and event.content.parts
                and any(part.text for part in event.content.parts)
            ):
                agent_response = "".join(
                    part.text for part in event.content.parts if part.text
                )

        # Dispatch the response back to the sender via WhatsApp API tool
        if agent_response:
            send_whatsapp_message(
                recipient_phone=sender_phone, message_text=agent_response
            )

        return {"status": "success"}

    except Exception as e:
        print(f"Error handling WhatsApp webhook: {e}")
        return {"status": "error", "detail": str(e)}


# Serve React frontend static files
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../frontend_dist")
)
if os.path.exists(frontend_dist):
    # Clear default root redirect route from ADK setup to serve React index.html
    app.routes = [r for r in app.routes if r.path != "/"]
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
