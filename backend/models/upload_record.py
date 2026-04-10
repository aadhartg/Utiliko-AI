import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from core.database import Base


class UploadRecord(Base):

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
