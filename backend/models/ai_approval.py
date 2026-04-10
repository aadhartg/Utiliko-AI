import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class AIApproval(Base):

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
