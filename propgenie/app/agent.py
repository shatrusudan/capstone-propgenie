# ruff: noqa
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
import google.auth
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

# Import PropGenie standard tools directly from tools.py
from app.tools import (
    get_properties_and_tenants,
    get_overdue_tenants,
    log_rent_payment,
    log_expense,
    create_maintenance_ticket,
    update_ticket_status,
    get_maintenance_tickets,
    get_financial_report,
    create_calendar_event,
    send_whatsapp_message,
    generate_payment_link,
    send_email_notification,
    upload_document,
    add_property,
    add_tenant,
    create_lease_contract,
    sign_lease_contract,
    get_contracts_status,
    renew_lease_contract,
    terminate_lease_contract,
    get_legal_and_evictions,
    update_eviction_milestone,
    send_auto_reminders,
)

# Initialize Google Cloud Project configuration for ADK Vertex AI models
_, project_id = google.auth.default()
os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

# Define the models using Vertex AI model names
flash_model = Gemini(
    model="gemini-3.5-flash",
    retry_options=types.HttpRetryOptions(attempts=3),
)

pro_model = Gemini(
    model="gemini-2.5-pro",
    retry_options=types.HttpRetryOptions(attempts=3),
)


# ==========================================
# DEFINE SPECIALIZED AGENTS & TOOLS
# ==========================================

# 1. Automation Agent Definition
automation_agent = Agent(
    name="automation_agent",
    model=flash_model,
    instruction="""You are PropGenie's Automation Agent.
Your responsibility is to automate notifications, find overdue tenants, send rent reminders, and manage scheduled calendar alerts.

Available Tools:
- get_overdue_tenants: Finds tenants whose rent is unpaid in the database.
- generate_payment_link: Generates a Razorpay payment link for a tenant.
- send_whatsapp_message: Sends WhatsApp reminders to the tenant's phone.
- send_email_notification: Sends email reminders to the tenant's email.
- create_calendar_event: Records rent due/reminder dates in the calendar.

When asked to send reminders, follow this process:
1. Retrieve the list of overdue tenants.
2. For each overdue tenant, generate a Razorpay payment link.
3. Send a WhatsApp message to their phone and an email notification with the payment link.
4. Schedule a calendar event for the reminder.
5. Report the status back when complete.
""",
    description="Handles finding overdue tenants, generating payment links, sending WhatsApp and Gmail notifications, and creating calendar events.",
    tools=[
        get_overdue_tenants,
        send_whatsapp_message,
        generate_payment_link,
        send_email_notification,
        create_calendar_event,
        send_auto_reminders,
    ],
)


# 2. Maintenance Agent Definition
maintenance_agent = Agent(
    name="maintenance_agent",
    model=flash_model,
    instruction="""You are PropGenie's Maintenance Agent.
Your responsibility is to manage the life cycle of maintenance requests, notify tenants, and coordinate repairs.

Available Tools:
- get_maintenance_tickets: Retrieves all current tickets.
- create_maintenance_ticket: Creates a new ticket when a tenant reports an issue.
- update_ticket_status: Assigns a vendor and updates ticket status (Open, In Progress, Closed).
- send_whatsapp_message: Notifies the tenant of ticket status updates.
- send_email_notification: Informs the owner or vendor of new repair tasks.
- upload_document: Uploads maintenance/damage photos to storage.
- create_calendar_event: Schedules repair appointments in the calendar.

Help the user create, track, or update tickets, coordinate vendor schedules, upload necessary photos, and summarize the actions taken.
""",
    description="Manages maintenance requests, creating and updating statuses, assigning vendors, uploading photos, sending tenant updates, and scheduling calendar events.",
    tools=[
        get_maintenance_tickets,
        create_maintenance_ticket,
        update_ticket_status,
        send_whatsapp_message,
        send_email_notification,
        upload_document,
        create_calendar_event,
    ],
)


# 3. Finance Agent Definition (Runs on gemini-2.5-pro)
finance_agent = Agent(
    name="finance_agent",
    model=pro_model,
    instruction="""You are PropGenie's Finance Agent.
Your responsibility is to manage the financial records of the properties, log transactions, and compute the P&L report.

Available Tools:
- log_rent_payment: Logs a payment from a tenant and marks their rent as paid.
- log_expense: Logs property expenses (plumbing, repair costs).
- get_financial_report: Generates a P&L financial summary of collected rent vs. operational expenses.
- send_email_notification: Emails financial statements or receipts to the owner or tenants.
- upload_document: Uploads lease files or receipt documents.

Perform all mathematical and financial calculations carefully, and format the financial summary in a clear table for the property owner.
""",
    description="Handles P&L summaries, logging rent payments, logging operational expenses, sending statements, and uploading lease files.",
    tools=[
        log_rent_payment,
        log_expense,
        get_financial_report,
        send_email_notification,
        upload_document,
    ],
)


# 4. Legal & Contract Agent Definition
legal_agent = Agent(
    name="legal_agent",
    model=flash_model,
    instruction="""You are PropGenie's Legal and Contract Agent.
Your responsibility is to manage lease contract lifecycles, simulate signings, manage renewals, handle contract terminations, and coordinate the CDMX court eviction process milestones dashboard.

Available Tools:
- create_lease_contract: Generates a new lease contract in Draft status.
- sign_lease_contract: Moves a lease contract from Draft to Active, logging the signing timestamp.
- get_contracts_status: Retrieves all contracts, including remaining days left.
- renew_lease_contract: Renews/extends a contract's end date and updates monthly rent.
- terminate_lease_contract: Sets lease to Terminated and sets tenant status to Vacated.
- get_legal_and_evictions: Retrieves active legal protection policies, credit default coverage details, and CDMX court eviction progress milestones.
- update_eviction_milestone: Updates the status of an eviction milestone.
""",
    description="Manages lease contracts, drafts, signatures, renewals, terminations, legal protections, and CDMX court eviction milestones.",
    tools=[
        create_lease_contract,
        sign_lease_contract,
        get_contracts_status,
        renew_lease_contract,
        terminate_lease_contract,
        get_legal_and_evictions,
        update_eviction_milestone,
        send_auto_reminders,
    ],
)


# 5. Root Coordinator Agent Definition
root_agent = Agent(
    name="root_agent",
    model=flash_model,
    instruction="""You are PropGenie's central Coordinator (Intent Agent).
Your job is to understand the user's intent (property owner or tenant message) and delegate the task to the appropriate specialist sub-agent.

Sub-Agents:
- automation_agent: Handles reminders, payment links, and notifications.
- maintenance_agent: Handles creating, tracking, and updating maintenance tickets, photo uploads, and repair schedules.
- finance_agent: Handles rent logging, expense logging, and P&L summaries.
- legal_agent: Handles lease contract creation, signings, renewals, terminations, legal policies, and CDMX eviction court milestones.

For general queries, property/tenant management (like adding or modifying properties/tenants), you can directly use your own tools.
Always delegate the query to the correct sub-agent based on the domain.
""",
    tools=[get_properties_and_tenants, add_property, add_tenant],
    sub_agents=[automation_agent, maintenance_agent, finance_agent, legal_agent],
)


# Expose the application
app = App(
    root_agent=root_agent,
    name="app",
)
