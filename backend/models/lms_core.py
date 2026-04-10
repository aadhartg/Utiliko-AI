# backend/models/lms_core.py
import uuid
import enum
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
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from core.database import Base


class RoleEnum(str, enum.Enum):
    super_admin = "super_admin"
    employee = "employee"


class ProgressStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(200), nullable=False, unique=True, index=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False, default=RoleEnum.employee)
    full_name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    department_id = Column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department")


class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(300), nullable=False)
    material_url = Column(String(500))
    department_id = Column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False
    )
    level = Column(String(50), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department")
    uploader = relationship("User")


class Course(Base):
    __tablename__ = "courses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    department_id = Column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=False
    )
    title = Column(String(300), nullable=False)
    level = Column(String(50), nullable=False)
    lessons = Column(JSON, nullable=False, default=list)
    quiz_questions = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document")
    department = relationship("Department")


class EmployeeCourseProgress(Base):
    __tablename__ = "employee_course_progress"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    status = Column(SAEnum(ProgressStatus), default=ProgressStatus.not_started)
    score = Column(Float, default=0.0)
    attempts_count = Column(Integer, default=0)
    last_attempt_at = Column(DateTime)
    started_at = Column(DateTime, nullable=True)
    completed_lessons = Column(JSON, nullable=False, default=list)
    lessons_viewed = Column(JSON, nullable=False, default=list)
    correct_answers_count = Column(Integer, default=0)
    total_questions_asked = Column(Integer, default=0)
    total_time_seconds = Column(Integer, default=0)
    chat_history = Column(JSON, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("employee_id", "course_id", name="uq_emp_course"),
    )
    employee = relationship("User")
    course = relationship("Course")
