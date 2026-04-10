import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base
import enum


class ActionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    executed = "executed"
    failed = "failed"


class AIAction(Base):

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
