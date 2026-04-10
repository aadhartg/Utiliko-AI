import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


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
