# backend/models/lms_models.py
"""
Task 2 — LMS: SQLAlchemy ORM models.
Covers courses, tracks, enrollments, quizzes, certificates, badges + audit.
"""

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


class TrackLevel(str, enum.Enum):
    level_1 = "Level 1"
    level_2 = "Level 2"
    level_3 = "Level 3"


class EnrollmentStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    paused = "paused"


class QuizMode(str, enum.Enum):
    standard = "standard"
    conversational = "conversational"  # AI chat-based


# ────────────────────────────────────────
# Courses & Modules
# ────────────────────────────────────────


class LMSCourse(Base):
    __tablename__ = "lms_courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    department = Column(
        String(100), nullable=False, index=True
    )  # Sales, PC, Accounting, etc.
    created_by = Column(String(200))
    material_url = Column(String(500))  # doc/video URL
    ai_generated_summary = Column(Text)  # LLM summary of material
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    modules = relationship(
        "LMSModule", back_populates="course", cascade="all, delete-orphan"
    )
    track_links = relationship("LMSTrackCourse", back_populates="course")


class LMSModule(Base):
    __tablename__ = "lms_modules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lms_courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(300), nullable=False)
    content = Column(Text)
    video_url = Column(String(500))
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("LMSCourse", back_populates="modules")
    quiz_questions = relationship(
        "LMSQuizQuestion", back_populates="module", cascade="all, delete-orphan"
    )


# ────────────────────────────────────────
# Tracks & Enrollment
# ────────────────────────────────────────


class LMSTrack(Base):
    __tablename__ = "lms_tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # Level 1 / Level 2 / Level 3
    level = Column(SAEnum(TrackLevel), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    track_courses = relationship("LMSTrackCourse", back_populates="track")
    enrollments = relationship("LMSEnrollment", back_populates="track")
    certificates = relationship("LMSCertificate", back_populates="track")
    badges = relationship("LMSBadge", back_populates="track")


class LMSTrackCourse(Base):
    """Join table: which courses belong to which track, in what order."""

    __tablename__ = "lms_track_courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    track_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lms_tracks.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lms_courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_index = Column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("track_id", "course_id", name="uq_track_course"),
    )

    track = relationship("LMSTrack", back_populates="track_courses")
    course = relationship("LMSCourse", back_populates="track_links")


class LMSEnrollment(Base):
    __tablename__ = "lms_enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(200), nullable=False, index=True)
    employee_email = Column(String(200), nullable=False)
    track_id = Column(UUID(as_uuid=True), ForeignKey("lms_tracks.id"), nullable=False)
    status = Column(SAEnum(EnrollmentStatus), default=EnrollmentStatus.in_progress)
    current_course_index = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

    track = relationship("LMSTrack", back_populates="enrollments")
    quiz_sessions = relationship("LMSQuizSession", back_populates="enrollment")


# ────────────────────────────────────────
# Quiz Engine
# ────────────────────────────────────────


class LMSQuizQuestion(Base):
    __tablename__ = "lms_quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lms_modules.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of option strings
    answer_hash = Column(
        String(256), nullable=False
    )  # bcrypt hash — never exposed to client
    explanation = Column(Text)
    difficulty = Column(Integer, default=1)  # 1 Easy / 2 Medium / 3 Hard
    ai_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    module = relationship("LMSModule", back_populates="quiz_questions")
    attempts = relationship("LMSQuizAttempt", back_populates="question")


class LMSQuizSession(Base):
    """One quiz attempt session per enrollment per module."""

    __tablename__ = "lms_quiz_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(
        UUID(as_uuid=True), ForeignKey("lms_enrollments.id"), nullable=False, index=True
    )
    module_id = Column(UUID(as_uuid=True), ForeignKey("lms_modules.id"), nullable=False)
    mode = Column(SAEnum(QuizMode), default=QuizMode.standard)
    attempt_number = Column(Integer, default=1)  # increments until 100%
    score = Column(Float)  # 0.0 - 100.0
    passed = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    # Anti-cheating fields
    ip_hash = Column(String(100))
    session_fingerprint = Column(String(300))
    tab_switch_count = Column(Integer, default=0)
    time_spent_seconds = Column(Integer, default=0)

    enrollment = relationship("LMSEnrollment", back_populates="quiz_sessions")
    attempts = relationship("LMSQuizAttempt", back_populates="session")


class LMSQuizAttempt(Base):
    """One row per question answered in a quiz session."""

    __tablename__ = "lms_quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lms_quiz_sessions.id"),
        nullable=False,
        index=True,
    )
    question_id = Column(
        UUID(as_uuid=True), ForeignKey("lms_quiz_questions.id"), nullable=False
    )
    selected_option_index = Column(Integer)  # index into "options" array
    is_correct = Column(Boolean, nullable=False)
    time_taken_seconds = Column(Integer)  # anti-cheating: too fast = flagged
    answered_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("LMSQuizSession", back_populates="attempts")
    question = relationship("LMSQuizQuestion", back_populates="attempts")


# ────────────────────────────────────────
# Conversational AI Quiz
# ────────────────────────────────────────


class LMSConvQuizMessage(Base):
    """Chat history for conversational AI quiz sessions."""

    __tablename__ = "lms_conv_quiz_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("lms_quiz_sessions.id"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)  # "assistant" | "user"
    content = Column(Text, nullable=False)
    is_question = Column(Boolean, default=False)
    is_correct = Column(Boolean)  # null until evaluated
    timestamp = Column(DateTime, default=datetime.utcnow)


# ────────────────────────────────────────
# Certifications & Badges
# ────────────────────────────────────────


class LMSCertificate(Base):
    __tablename__ = "lms_certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(200), nullable=False, index=True)
    employee_email = Column(String(200), nullable=False)
    track_id = Column(UUID(as_uuid=True), ForeignKey("lms_tracks.id"), nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)
    cert_url = Column(String(500))  # PDF path
    cert_serial = Column(String(100), unique=True)  # verifiable serial number

    track = relationship("LMSTrack", back_populates="certificates")


class LMSBadge(Base):
    __tablename__ = "lms_badges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    icon_url = Column(String(500))
    track_id = Column(UUID(as_uuid=True), ForeignKey("lms_tracks.id"), unique=True)

    track = relationship("LMSTrack", back_populates="badges")
    employee_badges = relationship("LMSEmployeeBadge", back_populates="badge")


class LMSEmployeeBadge(Base):
    __tablename__ = "lms_employee_badges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(200), nullable=False, index=True)
    badge_id = Column(UUID(as_uuid=True), ForeignKey("lms_badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("employee_id", "badge_id", name="uq_emp_badge"),)

    badge = relationship("LMSBadge", back_populates="employee_badges")


# ────────────────────────────────────────
# LMS Audit Log
# ────────────────────────────────────────


class LMSAuditLog(Base):
    """Append-only log of all LMS actions (enrollment, quiz, certification)."""

    __tablename__ = "lms_audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(200), nullable=False, index=True)
    action = Column(
        String(100), nullable=False
    )  # enrolled, quiz_started, quiz_passed, cert_issued
    detail = Column(JSON)
    ip_hash = Column(String(100))
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
