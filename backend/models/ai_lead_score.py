import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class AILeadScore(Base):

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
