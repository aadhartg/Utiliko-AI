import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class AIAuditLog(Base):

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
