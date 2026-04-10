import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


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
