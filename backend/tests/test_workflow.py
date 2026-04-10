"""
backend/tests/test_workflow.py — Task 1 automated tests
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from guardrails import ValidatedAIAction, parse_llm_action, ApprovalLevel
from ml.predict import _rule_based_fallback, get_tier

# ─── Guardrail Tests ──────────────────────────────────────────


class TestGuardrails:
    def test_valid_email_action(self):
        action = ValidatedAIAction(
            action_type="send_email",
            payload={
                "subject": "Follow Up",
                "body": "Hi, following up on our discussion.",
                "recipient_email": "client@example.com",
                "cc_emails": [],
            },
            reasoning="Warm lead needs nurturing",
            confidence=0.85,
        )
        assert action.action_type.value == "send_email"
        assert action.approval_level == ApprovalLevel.human_review  # 0.85 < 0.90

    def test_high_confidence_email_auto_approved(self):
        action = ValidatedAIAction(
            action_type="send_email",
            payload={
                "subject": "Follow Up",
                "body": "Thanks for your time.",
                "recipient_email": "client@example.com",
                "cc_emails": [],
            },
            reasoning="High confidence follow-up",
            confidence=0.95,
        )
        assert action.approval_level == ApprovalLevel.auto

    def test_stage_update_to_won_requires_exec(self):
        action = ValidatedAIAction(
            action_type="update_stage",
            payload={"new_stage": "Won", "reason": "Deal closed"},
            reasoning="Customer confirmed purchase",
            confidence=0.80,
        )
        assert action.approval_level == ApprovalLevel.executive

    def test_invalid_stage_raises(self):
        with pytest.raises(Exception):
            ValidatedAIAction(
                action_type="update_stage",
                payload={"new_stage": "SuperWon", "reason": "Invalid"},
                reasoning="bad",
                confidence=0.5,
            )

    def test_unfilled_template_blocked(self):
        with pytest.raises(Exception):
            ValidatedAIAction(
                action_type="send_email",
                payload={
                    "subject": "Hello",
                    "body": "Hi {{name}}, this is broken.",
                    "recipient_email": "a@b.com",
                    "cc_emails": [],
                },
                reasoning="has placeholders",
                confidence=0.6,
            )

    def test_email_subject_too_long(self):
        with pytest.raises(Exception):
            ValidatedAIAction(
                action_type="send_email",
                payload={
                    "subject": "x" * 201,
                    "body": "body",
                    "recipient_email": "a@b.com",
                    "cc_emails": [],
                },
                reasoning="long subject",
                confidence=0.6,
            )

    def test_call_duration_out_of_range(self):
        with pytest.raises(Exception):
            ValidatedAIAction(
                action_type="schedule_call",
                payload={
                    "proposed_time_utc": "2026-04-05T14:00:00Z",
                    "duration_minutes": 999,
                    "notes": "",
                },
                reasoning="too long",
                confidence=0.7,
            )


# ─── ML Tests ─────────────────────────────────────────────────


class TestMLFallback:
    def test_hot_lead_high_score(self):
        score = _rule_based_fallback(
            {"stage": "Negotiation", "last_activity_days_ago": 1, "avg_sentiment": 0.9}
        )
        assert score > 0.5

    def test_cold_lead_low_score(self):
        score = _rule_based_fallback(
            {"stage": "New", "last_activity_days_ago": 60, "avg_sentiment": 0.1}
        )
        assert score < 0.4

    def test_get_tier_hot(self):
        assert get_tier(0.75) == "Hot"

    def test_get_tier_warm(self):
        assert get_tier(0.55) == "Warm"

    def test_get_tier_cold(self):
        assert get_tier(0.2) == "Cold"

    def test_score_capped_at_one(self):
        score = _rule_based_fallback(
            {"stage": "Won", "last_activity_days_ago": 0, "avg_sentiment": 1.0}
        )
        assert score <= 1.0
