from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class WorkflowRunResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    lead_id: str
    score: float
    tier: str
    action_id: Optional[str] = None
    action_type: Optional[str] = None
    action_status: Optional[str] = None


class ScoreItem(BaseModel):
    model_config = {"protected_namespaces": ()}
    score_id: str
    lead_id: str
    score: float
    tier: str
    model_version: str
    scored_at: datetime


class ActionItem(BaseModel):
    action_id: str
    lead_id: str
    action_type: str
    status: str
    created_at: datetime
    action_payload: dict


class ApprovalRequest(BaseModel):
    reviewer_email: str
    notes: Optional[str] = None
    updated_payload: Optional[dict] = None


class AuditEntry(BaseModel):
    log_id: str
    event_type: str
    entity_type: str
    entity_id: str
    actor: str
    detail: dict
    is_ai_generated: bool
    timestamp: datetime


class MonitorSnapshot(BaseModel):
    active_leads: int
    pending_approvals: int
    actions_last_24h: int
    avg_lead_score: float
    hot_leads: int
    warm_leads: int
    cold_leads: int
    last_job_run: Optional[str]


class MessageResponse(BaseModel):
    status_code: int = 200
    message: str
    success: bool = True
