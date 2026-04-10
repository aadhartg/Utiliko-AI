import uuid
from datetime import datetime
from sqlalchemy import Column, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


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
