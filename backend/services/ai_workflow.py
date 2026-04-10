import json
import uuid
from datetime import datetime
from typing import Optional

from openai import AsyncOpenAI
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.logger import logger
from guardrails import ValidatedAIAction, ApprovalLevel, parse_llm_action
from ml.predict import score_lead
from models.workflow_models import (
    Lead,
    AILeadScore,
    AIAction,
    AIAuditLog,
    AIApproval,
    ActionStatus,
)

settings = settings
openai_client = (
    AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
)


# ─── Audit Helper ──────────────────────────────────────────────


async def _audit(
    db: AsyncSession,
    event_type: str,
    entity_type: str,
    entity_id: str,
    actor: str,
    detail: dict,
    is_ai: bool = True,
):
    log = AIAuditLog(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
        detail=detail,
        is_ai_generated=is_ai,
    )
    db.add(log)
    await db.flush()
    logger.info(event_type, entity_id=entity_id, actor=actor)


# ─── Step 1: ML Scoring ────────────────────────────────────────


async def run_lead_scoring(lead: Lead, db: AsyncSession) -> AILeadScore:
    """Run ML model on a lead and persist the score."""
    features = {
        "source": lead.source,
        "industry": lead.industry,
        "company_size": lead.company_size or 0,
        "expected_revenue": lead.expected_revenue or 0,
        "stage": lead.stage,
        "stage_age_days": lead.stage_age_days or 0,
        "total_activities": lead.total_activities or 0,
        "total_emails": lead.total_emails or 0,
        "total_calls": lead.total_calls or 0,
        "total_meetings": lead.total_meetings or 0,
        "last_activity_days_ago": lead.last_activity_days_ago or 30,
        # Sentiment defaults — enriched by scheduler if notes available
        "avg_sentiment": 0.5,
        "note_count": 0,
        "sentiment_volatility": 0,
    }

    result = score_lead(features)

    score_row = AILeadScore(
        lead_id=lead.lead_id,
        score=result["score"],
        tier=result["tier"],
        model_version=result["model_version"],
        features_snapshot=result["features_used"],
    )
    db.add(score_row)
    await db.flush()

    await _audit(
        db,
        "score_computed",
        "lead",
        str(lead.lead_id),
        "system",
        {
            "score": result["score"],
            "tier": result["tier"],
            "is_fallback": result["is_fallback"],
        },
    )

    return score_row


# ─── Step 2: LLM Action Drafting ───────────────────────────────

SYSTEM_PROMPT = """You are a CRM assistant for Utiliko. Given a lead's profile and ML score,
propose ONE follow-up action to maximize deal conversion.

Respond ONLY with valid JSON matching this schema:
{
  "action_type": "send_email" | "schedule_call" | "update_stage" | "add_note" | "flag_for_review",
  "payload": { ... action-specific fields ... },
  "reasoning": "brief explanation",
  "confidence": 0.0-1.0
}

Payload schemas:
- send_email: {subject, body, recipient_email, cc_emails}
- schedule_call: {proposed_time_utc, duration_minutes, notes}
- update_stage: {new_stage, reason}
- add_note: {note_text}
- flag_for_review: {}
"""


async def draft_ai_action(
    lead: Lead,
    score_row: AILeadScore,
    db: AsyncSession,
) -> Optional[AIAction]:
    """Call LLM to draft a follow-up action. Falls back to rule-based if unavailable."""

    user_message = f"""
Lead ID: {lead.lead_id}
Stage: {lead.stage} (for {lead.stage_age_days} days)
Industry: {lead.industry}, Company Size: {lead.company_size}
Expected Revenue: ${lead.expected_revenue:,.2f}
Activities: {lead.total_activities} total ({lead.total_emails} emails, {lead.total_calls} calls, {lead.total_meetings} meetings)
Last Activity: {lead.last_activity_days_ago} days ago
ML Win Score: {score_row.score:.2f} ({score_row.tier})
"""

    raw_response = None
    validated_action: Optional[ValidatedAIAction] = None

    if openai_client and settings.openai_api_key:
        try:
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
                max_tokens=600,
            )
            raw_response = response.choices[0].message.content
            parsed = json.loads(raw_response)
            validated_action = parse_llm_action(parsed)

        except ValidationError as e:
            logger.warning("llm_output_validation_failed", error=str(e))
            await _audit(
                db,
                "guardrail_rejected",
                "lead",
                str(lead.lead_id),
                "system",
                {"reason": str(e), "raw": raw_response},
            )
            # Fall through to rule-based
        except Exception as e:
            logger.error("llm_call_failed", error=str(e))
            await _audit(
                db, "llm_failed", "lead", str(lead.lead_id), "system", {"error": str(e)}
            )

    # ─── Deterministic Fallback ─────────────────────────────────
    if validated_action is None:
        validated_action = _rule_based_action(lead, score_row)
        logger.info("using_rule_based_fallback", lead_id=str(lead.lead_id))
        await _audit(
            db,
            "fallback_used",
            "lead",
            str(lead.lead_id),
            "system",
            {"tier": score_row.tier},
        )

    # ─── Persist Action ─────────────────────────────────────────
    action_row = AIAction(
        lead_id=lead.lead_id,
        action_type=validated_action.action_type.value,
        action_payload=validated_action.payload,
        raw_llm_response=raw_response,
        prompt_used=SYSTEM_PROMPT[:500],
        model_name="gpt-4o-mini" if raw_response else "rule-based",
        status=ActionStatus.pending,
    )
    db.add(action_row)
    await db.flush()

    await _audit(
        db,
        "action_drafted",
        "ai_action",
        str(action_row.action_id),
        "system",
        {
            "action_type": validated_action.action_type.value,
            "confidence": validated_action.confidence,
            "approval_level": validated_action.approval_level.value,
        },
    )

    # Auto-approve low-risk, high-confidence actions
    if validated_action.approval_level == ApprovalLevel.auto:
        action_row.status = ActionStatus.approved
        action_row.approved_by = "system-auto"
        action_row.approved_at = datetime.utcnow()
        await _audit(
            db,
            "auto_approved",
            "ai_action",
            str(action_row.action_id),
            "system-auto",
            {
                "confidence": validated_action.confidence,
            },
        )
    else:
        # Add to approval queue
        approval = AIApproval(action_id=action_row.action_id)
        db.add(approval)

    return action_row


def _rule_based_action(lead: Lead, score_row: AILeadScore) -> ValidatedAIAction:
    """Fully deterministic fallback — no AI involved."""
    if score_row.tier == "Hot" and lead.last_activity_days_ago > 3:
        return ValidatedAIAction(
            action_type="schedule_call",
            payload={
                "proposed_time_utc": "2026-04-05T14:00:00Z",
                "duration_minutes": 30,
                "notes": f"High-value {lead.stage} lead — follow up urgently",
            },
            reasoning="Hot lead with no recent activity; schedule call immediately.",
            confidence=0.75,
        )
    elif score_row.tier == "Warm":
        return ValidatedAIAction(
            action_type="send_email",
            payload={
                "subject": "Continuing our conversation",
                "body": f"Hi, following up on your interest in our solution. Happy to answer any questions.",
                "recipient_email": f"lead_{lead.lead_id}@example.com",
                "cc_emails": [],
            },
            reasoning="Warm lead — nurture with email.",
            confidence=0.65,
        )
    else:
        return ValidatedAIAction(
            action_type="add_note",
            payload={
                "note_text": f"Cold lead — scored {score_row.score:.2f}. Consider re-engagement campaign."
            },
            reasoning="Cold lead — log for re-engagement.",
            confidence=0.60,
        )


# ─── Full Workflow Orchestrator ────────────────────────────────


async def run_full_workflow(lead_id: str, db: AsyncSession) -> dict:
    """
    Entry point: run the complete AI workflow for a single lead.
    Returns a summary dict of what happened.
    """
    result = await db.execute(select(Lead).where(Lead.lead_id == uuid.UUID(lead_id)))
    lead = result.scalar_one_or_none()
    if not lead:
        raise ValueError(f"Lead {lead_id} not found")

    score_row = await run_lead_scoring(lead, db)
    action_row = await draft_ai_action(lead, score_row, db)
    await db.commit()

    return {
        "lead_id": lead_id,
        "score": score_row.score,
        "tier": score_row.tier,
        "action_id": str(action_row.action_id) if action_row else None,
        "action_type": action_row.action_type if action_row else None,
        "action_status": action_row.status.value if action_row else None,
    }
