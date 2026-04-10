import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime
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
