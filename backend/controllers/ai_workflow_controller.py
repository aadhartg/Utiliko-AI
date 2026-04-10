from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession


from core.database import get_db
from core.logger import logger
from models import (
    AILeadScore,
    AIAction,
    AIAuditLog,
    AIApproval,
    ActionStatus,
    Lead,
    UploadRecord,
)
from services.ai_workflow import run_full_workflow
from schemas import WorkflowRunResponse, ScoreItem, ActionItem, ApprovalRequest

router = APIRouter(prefix="/workflow", tags=["AI Workflow"])


@router.post("/run/{lead_id}", response_model=WorkflowRunResponse)
async def trigger_workflow(
    lead_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Trigger the full AI workflow for a lead (score → draft action → queue for approval)."""
    try:
        result = await run_full_workflow(lead_id, db)
        return WorkflowRunResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("workflow_error", lead_id=lead_id, error=str(e))
        raise HTTPException(status_code=500, detail="Workflow execution failed")


@router.get("/scores", response_model=list[ScoreItem])
async def get_scores(
    tier: Optional[str] = Query(None, description="Filter by tier: Hot, Warm, Cold"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """Get AI lead scores, optionally filtered by tier."""
    q = (
        select(AILeadScore)
        .order_by(desc(AILeadScore.scored_at))
        .offset(offset)
        .limit(limit)
    )
    if tier:
        q = q.where(AILeadScore.tier == tier)
    result = await db.execute(q)
    scores = result.scalars().all()
    return [
        ScoreItem(
            score_id=str(s.score_id),
            lead_id=str(s.lead_id),
            score=s.score,
            tier=s.tier,
            model_version=s.model_version,
            scored_at=s.scored_at,
        )
        for s in scores
    ]


@router.get("/actions", response_model=list[ActionItem])
async def get_actions(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List AI actions, optionally filtered by status."""
    q = select(AIAction).order_by(desc(AIAction.created_at)).limit(limit)
    if status:
        q = q.where(AIAction.status == status)
    result = await db.execute(q)
    actions = result.scalars().all()
    return [
        ActionItem(
            action_id=str(a.action_id),
            lead_id=str(a.lead_id),
            action_type=a.action_type,
            status=a.status.value,
            created_at=a.created_at,
            action_payload=a.action_payload or {},
        )
        for a in actions
    ]


@router.post("/approve/{action_id}")
async def approve_action(
    action_id: str,
    body: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """Human approval gate — approve an AI action for execution."""
    result = await db.execute(
        select(AIAction).where(AIAction.action_id == UUID(action_id))
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if action.status != ActionStatus.pending:
        raise HTTPException(
            status_code=400, detail=f"Action is already '{action.status.value}'"
        )

    action.status = ActionStatus.approved
    action.approved_by = body.reviewer_email
    action.approved_at = datetime.utcnow()

    if body.updated_payload is not None:
        action.action_payload = body.updated_payload

    approval_result = await db.execute(
        select(AIApproval).where(AIApproval.action_id == UUID(action_id))
    )
    approval = approval_result.scalar_one_or_none()
    if approval:
        approval.reviewer_email = body.reviewer_email
        approval.decision = "approved"
        approval.decided_at = datetime.utcnow()

    log = AIAuditLog(
        event_type="action_approved",
        entity_type="ai_action",
        entity_id=action_id,
        actor=body.reviewer_email,
        detail={"notes": body.notes},
        is_ai_generated=False,
    )
    db.add(log)
    await db.commit()
    return {"message": "Action approved", "action_id": action_id}


@router.post("/reject/{action_id}")
async def reject_action(
    action_id: str,
    body: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """Human rejection gate — reject an AI action."""
    result = await db.execute(
        select(AIAction).where(AIAction.action_id == UUID(action_id))
    )
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    action.status = ActionStatus.rejected
    action.approved_by = body.reviewer_email
    action.approved_at = datetime.utcnow()
    action.rejection_reason = body.notes

    log = AIAuditLog(
        event_type="action_rejected",
        entity_type="ai_action",
        entity_id=action_id,
        actor=body.reviewer_email,
        detail={"reason": body.notes},
        is_ai_generated=False,
    )
    db.add(log)
    await db.commit()
    return {"message": "Action rejected", "action_id": action_id}
