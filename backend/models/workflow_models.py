# backend/models/workflow_models.py
"""
Task 1 — AI Workflow: SQLAlchemy ORM models.
Tables: leads, activities, notes, opportunities (mirrors CSV data)
+ AI-generated: ai_lead_scores, ai_actions, ai_audit_log, ai_approvals
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base
import enum


class LeadStage(str, enum.Enum):
    new = "New"
    contacted = "Contacted"
    proposal = "Proposal"
    negotiation = "Negotiation"
    won = "Won"
    lost = "Lost"


class ActionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    executed = "executed"
    failed = "failed"


# ────────────────────────────────────────
# Utiliko Core Entities (mirrors CSV data)
# ────────────────────────────────────────


class Lead(Base):
    __tablename__ = "leads"

    lead_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    source = Column(String(100))
    industry = Column(String(100))
    company_size = Column(Integer)
    expected_revenue = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    stage = Column(String(50), default="New")
    stage_age_days = Column(Integer, default=0)
    total_activities = Column(Integer, default=0)
    total_emails = Column(Integer, default=0)
    total_calls = Column(Integer, default=0)
    total_meetings = Column(Integer, default=0)
    last_activity_days_ago = Column(Integer, default=0)
    is_won = Column(Boolean, default=False)

    activities = relationship("Activity", back_populates="lead")
    notes = relationship("Note", back_populates="lead")
    opportunities = relationship("Opportunity", back_populates="lead")
    ai_scores = relationship("AILeadScore", back_populates="lead")
    ai_actions = relationship("AIAction", back_populates="lead")


class Activity(Base):
    __tablename__ = "activities"

    activity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        UUID(as_uuid=True), ForeignKey("leads.lead_id"), nullable=False, index=True
    )
    activity_type = Column(String(50))  # Email, Call, Meeting
    activity_timestamp = Column(DateTime)
    activity_duration_minutes = Column(Integer)
    outcome = Column(String(50))  # Positive, Negative, Neutral

    lead = relationship("Lead", back_populates="activities")


class Note(Base):
    __tablename__ = "notes"

    note_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        UUID(as_uuid=True), ForeignKey("leads.lead_id"), nullable=False, index=True
    )
    note_text = Column(Text)
    sentiment_score = Column(Float)  # 0.0 - 1.0
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="notes")


class Opportunity(Base):
    __tablename__ = "opportunities"

    opportunity_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        UUID(as_uuid=True), ForeignKey("leads.lead_id"), nullable=False, index=True
    )
    stage = Column(String(50))
    probability = Column(Float)
    revenue = Column(Float)
    closed_at = Column(DateTime)

    lead = relationship("Lead", back_populates="opportunities")


# ────────────────────────────────────────
# AI-Generated Entities
# ────────────────────────────────────────


class AILeadScore(Base):
    """ML model output per lead per scoring run."""

    __tablename__ = "ai_lead_scores"

    score_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        UUID(as_uuid=True), ForeignKey("leads.lead_id"), nullable=False, index=True
    )
    score = Column(Float, nullable=False)  # 0.0 - 1.0 win probability
    tier = Column(String(10))  # Hot / Warm / Cold
    model_version = Column(String(50))
    features_snapshot = Column(JSON)  # feature values used
    scored_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="ai_scores")


class AIAction(Base):
    """LLM-drafted follow-up action for a lead, requires approval."""

    __tablename__ = "ai_actions"

    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lead_id = Column(
        UUID(as_uuid=True), ForeignKey("leads.lead_id"), nullable=False, index=True
    )
    action_type = Column(String(50))  # send_email, schedule_call, etc.
    action_payload = Column(JSON)  # LLM-generated content (validated)
    raw_llm_response = Column(Text)  # original LLM output stored for audit
    prompt_used = Column(Text)  # prompt sent to LLM
    model_name = Column(String(100))
    status = Column(SAEnum(ActionStatus), default=ActionStatus.pending)
    approved_by = Column(String(200))  # user who approved/rejected
    approved_at = Column(DateTime)
    rejection_reason = Column(Text)
    executed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", back_populates="ai_actions")


class AIAuditLog(Base):
    """Immutable append-only audit trail for every AI decision."""

    __tablename__ = "ai_audit_log"

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(
        String(100), nullable=False
    )  # score_computed, action_drafted, approved, executed
    entity_type = Column(String(50))  # lead, action, etc.
    entity_id = Column(String(200))
    actor = Column(String(200))  # "system" or user email
    detail = Column(JSON)  # structured detail blob
    is_ai_generated = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class AIApproval(Base):
    """Approval queue — human must approve before any AI action executes."""

    __tablename__ = "ai_approvals"

    approval_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action_id = Column(
        UUID(as_uuid=True), ForeignKey("ai_actions.action_id"), unique=True
    )
    reviewer_email = Column(String(200))
    decision = Column(String(20))  # approved / rejected
    notes = Column(Text)
    decided_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class UploadRecord(Base):
    """Stores each CSV/Excel upload and its ML scoring results."""

    __tablename__ = "upload_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(500), nullable=False)
    total_leads = Column(Integer, default=0)
    hot_count = Column(Integer, default=0)
    warm_count = Column(Integer, default=0)
    cold_count = Column(Integer, default=0)
    avg_score = Column(Float, default=0.0)
    model_version = Column(String(100))
    is_fallback = Column(Boolean, default=False)
    results = Column(JSON)  # full scored leads array
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # soft delete
