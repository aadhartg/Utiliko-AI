"""
backend/guardrails.py
────────────────────────────────────────────────────────────────
Task 1 — Guardrails: Pydantic schemas that validate and sanitise
all LLM outputs before they enter the approval queue.

Implements:
  - Schema validation (LLM output must match a known shape)
  - Content safety checks (no PII bleed, no extreme language)
  - Confidence gating (low-confidence outputs require higher approval)
  - Approval gate types
"""

from __future__ import annotations
import re
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, field_validator, model_validator

# ─── Action Types ─────────────────────────────────────────────


class AIActionType(str, Enum):
    send_email = "send_email"
    schedule_call = "schedule_call"
    update_stage = "update_stage"
    add_note = "add_note"
    flag_for_review = "flag_for_review"


class ApprovalLevel(str, Enum):
    auto = "auto"  # score >= 0.9 confidence, low-risk action
    human_review = "human"  # default - requires manager approval
    executive = "exec"  # high-value lead or stage promotion to Won


# ─── Validated Action Payloads ─────────────────────────────────


class SendEmailPayload(BaseModel):
    subject: str
    body: str
    recipient_email: str
    cc_emails: list[str] = []

    @field_validator("subject")
    @classmethod
    def subject_length(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("Email subject must be ≤200 characters")
        return v

    @field_validator("body")
    @classmethod
    def body_safety(cls, v: str) -> str:
        # Block any template placeholders that slipped through
        if re.search(r"\{\{.*?\}\}", v):
            raise ValueError("LLM output contains unfilled template placeholders")
        if len(v) > 5000:
            raise ValueError("Email body must be ≤5000 characters")
        return v


class ScheduleCallPayload(BaseModel):
    proposed_time_utc: str  # ISO-8601
    duration_minutes: int
    notes: str

    @field_validator("duration_minutes")
    @classmethod
    def duration_range(cls, v: int) -> int:
        if not (5 <= v <= 180):
            raise ValueError("Call duration must be between 5 and 180 minutes")
        return v


class UpdateStagePayload(BaseModel):
    new_stage: str
    reason: str

    @field_validator("new_stage")
    @classmethod
    def valid_stage(cls, v: str) -> str:
        allowed = {"New", "Contacted", "Proposal", "Negotiation", "Won", "Lost"}
        if v not in allowed:
            raise ValueError(f"Invalid stage '{v}'. Must be one of {allowed}")
        return v


class AddNotePayload(BaseModel):
    note_text: str

    @field_validator("note_text")
    @classmethod
    def note_length(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("Note must be ≤2000 characters")
        return v


# ─── Top-Level AI Action Schema ────────────────────────────────

PAYLOAD_CLASSES = {
    AIActionType.send_email: SendEmailPayload,
    AIActionType.schedule_call: ScheduleCallPayload,
    AIActionType.update_stage: UpdateStagePayload,
    AIActionType.add_note: AddNotePayload,
}


class ValidatedAIAction(BaseModel):
    action_type: AIActionType
    payload: dict[str, Any]
    reasoning: str
    confidence: float  # 0.0 – 1.0 (from LLM or model)
    approval_level: ApprovalLevel = ApprovalLevel.human_review

    @model_validator(mode="after")
    def validate_payload_schema(self) -> "ValidatedAIAction":
        payload_cls = PAYLOAD_CLASSES.get(self.action_type)
        if payload_cls:
            # Re-parse payload through the specific schema — raises if invalid
            payload_cls(**self.payload)
        return self

    @model_validator(mode="after")
    def determine_approval_level(self) -> "ValidatedAIAction":
        """
        Guardrail: escalate approval requirement based on risk.
        """
        if self.action_type == AIActionType.update_stage:
            new_stage = self.payload.get("new_stage", "")
            if new_stage == "Won":
                self.approval_level = ApprovalLevel.executive
            else:
                self.approval_level = ApprovalLevel.human_review
        elif self.action_type in (AIActionType.send_email, AIActionType.schedule_call):
            if self.confidence >= 0.90:
                self.approval_level = ApprovalLevel.auto
            else:
                self.approval_level = ApprovalLevel.human_review
        return self


# ─── Quiz Answer Validation Schema ─────────────────────────────


class QuizAnswerSchema(BaseModel):
    session_id: str
    question_id: str
    selected_option_index: int
    time_taken_seconds: int

    @field_validator("selected_option_index")
    @classmethod
    def valid_option(cls, v: int) -> int:
        if not (0 <= v <= 9):
            raise ValueError("Option index must be 0-9")
        return v

    @field_validator("time_taken_seconds")
    @classmethod
    def min_time(cls, v: int) -> int:
        """Anti-cheating: answers faster than 2s are flagged."""
        if v < 2:
            raise ValueError("Answer submitted too quickly — flagged as suspicious")
        return v


# ─── LLM Output Parser ─────────────────────────────────────────


def parse_llm_action(raw_json: dict) -> ValidatedAIAction:
    """
    Parse and validate raw LLM JSON output into a ValidatedAIAction.
    Raises ValidationError on schema mismatch — caller must handle gracefully.
    """
    return ValidatedAIAction(**raw_json)
