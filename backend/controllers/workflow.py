from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import io

from core.database import get_db
from core.logger import logger
from models.workflow_models import (
    AILeadScore,
    AIAction,
    AIAuditLog,
    AIApproval,
    ActionStatus,
    Lead,
    UploadRecord,
)
from services.ai_workflow import run_full_workflow

router = APIRouter(prefix="/workflow", tags=["AI Workflow"])
audit_router = APIRouter(prefix="/audit-log", tags=["Audit Log"])
monitor_router = APIRouter(prefix="/monitor", tags=["Monitoring"])


# ─── Request / Response Schemas ────────────────────────────────


class WorkflowRunResponse(BaseModel):
    lead_id: str
    score: float
    tier: str
    action_id: Optional[str]
    action_type: Optional[str]
    action_status: Optional[str]


class ScoreItem(BaseModel):
    score_id: str
    lead_id: str
    score: float
    tier: str
    model_version: str
    scored_at: datetime


class ActionItem(BaseModel):
    action_id: str
    lead_id: str
    action_type: str
    status: str
    created_at: datetime
    action_payload: dict


class ApprovalRequest(BaseModel):
    reviewer_email: str
    notes: Optional[str] = None


class AuditEntry(BaseModel):
    log_id: str
    event_type: str
    entity_type: str
    entity_id: str
    actor: str
    detail: dict
    is_ai_generated: bool
    timestamp: datetime


class MonitorSnapshot(BaseModel):
    active_leads: int
    pending_approvals: int
    actions_last_24h: int
    avg_lead_score: float
    hot_leads: int
    warm_leads: int
    cold_leads: int
    last_job_run: Optional[str]


# ─── Endpoints ─────────────────────────────────────────────────


@router.post("/run/{lead_id}", response_model=WorkflowRunResponse)
async def trigger_workflow(lead_id: str, db: AsyncSession = Depends(get_db)):
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


# ─── Audit Log ─────────────────────────────────────────────────


@audit_router.get("/", response_model=list[AuditEntry])
async def get_audit_log(
    event_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """Paginated, filterable immutable audit trail of all AI actions."""
    q = (
        select(AIAuditLog)
        .order_by(desc(AIAuditLog.timestamp))
        .offset(offset)
        .limit(limit)
    )
    if event_type:
        q = q.where(AIAuditLog.event_type == event_type)
    if entity_type:
        q = q.where(AIAuditLog.entity_type == entity_type)
    result = await db.execute(q)
    logs = result.scalars().all()
    return [
        AuditEntry(
            log_id=str(l.log_id),
            event_type=l.event_type,
            entity_type=l.entity_type or "",
            entity_id=l.entity_id or "",
            actor=l.actor or "",
            detail=l.detail or {},
            is_ai_generated=l.is_ai_generated,
            timestamp=l.timestamp,
        )
        for l in logs
    ]


# ─── Monitoring Endpoint ────────────────────────────────────────


@monitor_router.get("/", response_model=MonitorSnapshot)
async def get_monitor(db: AsyncSession = Depends(get_db)):
    """Production monitoring snapshot — suitable for Grafana / dashboards."""
    from datetime import timedelta

    cutoff = datetime.utcnow() - timedelta(hours=24)

    active_leads = (
        await db.execute(
            select(func.count(Lead.lead_id)).where(Lead.stage.notin_(["Won", "Lost"]))
        )
    ).scalar() or 0

    pending = (
        await db.execute(
            select(func.count(AIAction.action_id)).where(
                AIAction.status == ActionStatus.pending
            )
        )
    ).scalar() or 0

    recent_actions = (
        await db.execute(
            select(func.count(AIAction.action_id)).where(AIAction.created_at >= cutoff)
        )
    ).scalar() or 0

    avg_score_row = (await db.execute(select(func.avg(AILeadScore.score)))).scalar()
    avg_score = round(float(avg_score_row or 0), 4)

    hot = (
        await db.execute(
            select(func.count(AILeadScore.score_id)).where(AILeadScore.tier == "Hot")
        )
    ).scalar() or 0
    warm = (
        await db.execute(
            select(func.count(AILeadScore.score_id)).where(AILeadScore.tier == "Warm")
        )
    ).scalar() or 0
    cold = (
        await db.execute(
            select(func.count(AILeadScore.score_id)).where(AILeadScore.tier == "Cold")
        )
    ).scalar() or 0

    return MonitorSnapshot(
        active_leads=active_leads,
        pending_approvals=pending,
        actions_last_24h=recent_actions,
        avg_lead_score=avg_score,
        hot_leads=hot,
        warm_leads=warm,
        cold_leads=cold,
        last_job_run=None,  # Pulled from scheduler in production
    )


# ─── CSV / Excel Upload + Score ────────────────────────────────


@router.post("/upload-score")
async def upload_and_score(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    """
    Upload a CSV/Excel file of leads, run them through the ML scoring
    pipeline, save results to DB, and return scored results.
    """
    from ml.predict import score_lead

    # Read file
    contents = await file.read()
    filename = file.filename or "upload.csv"

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {str(e)}")

    # Required columns for scoring
    required_cols = {
        "source",
        "industry",
        "company_size",
        "expected_revenue",
        "stage",
        "stage_age_days",
        "total_activities",
        "total_emails",
        "total_calls",
        "total_meetings",
        "last_activity_days_ago",
    }
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing))}",
        )

    # Score each lead
    results = []
    for _, row in df.iterrows():
        features = {
            "source": str(row.get("source", "Direct")),
            "industry": str(row.get("industry", "IT")),
            "company_size": int(row.get("company_size", 100)),
            "expected_revenue": float(row.get("expected_revenue", 0)),
            "stage": str(row.get("stage", "New")),
            "stage_age_days": int(row.get("stage_age_days", 0)),
            "total_activities": int(row.get("total_activities", 0)),
            "total_emails": int(row.get("total_emails", 0)),
            "total_calls": int(row.get("total_calls", 0)),
            "total_meetings": int(row.get("total_meetings", 0)),
            "last_activity_days_ago": int(row.get("last_activity_days_ago", 30)),
            "avg_sentiment": float(row.get("avg_sentiment", 0.5)),
            "note_count": int(row.get("note_count", 0)),
            "sentiment_volatility": float(row.get("sentiment_volatility", 0)),
        }
        score_result = score_lead(features)
        results.append(
            {
                "lead_id": str(row.get("lead_id", "")),
                "company_size": features["company_size"],
                "source": features["source"],
                "industry": features["industry"],
                "stage": features["stage"],
                "expected_revenue": features["expected_revenue"],
                "score": score_result["score"],
                "tier": score_result["tier"],
                "model_version": score_result["model_version"],
                "is_fallback": score_result["is_fallback"],
            }
        )

    # Sort by score descending (most convertible first)
    results.sort(key=lambda x: x["score"], reverse=True)

    # Summary stats
    total = len(results)
    hot = sum(1 for r in results if r["tier"] == "Hot")
    warm = sum(1 for r in results if r["tier"] == "Warm")
    cold = sum(1 for r in results if r["tier"] == "Cold")
    avg = round(sum(r["score"] for r in results) / max(total, 1), 4)

    # Persist to DB
    record = UploadRecord(
        filename=filename,
        total_leads=total,
        hot_count=hot,
        warm_count=warm,
        cold_count=cold,
        avg_score=avg,
        model_version=results[0]["model_version"] if results else "unknown",
        is_fallback=results[0]["is_fallback"] if results else True,
        results=results,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return {
        "id": str(record.id),
        "total_leads": total,
        "hot_count": hot,
        "warm_count": warm,
        "cold_count": cold,
        "avg_score": avg,
        "leads": results,
    }


# ─── Upload Record CRUD ────────────────────────────────────────


@router.get("/uploads")
async def list_uploads(db: AsyncSession = Depends(get_db)):
    """List all upload records (excluding soft-deleted)."""
    result = await db.execute(
        select(UploadRecord)
        .where(UploadRecord.deleted_at.is_(None))
        .order_by(desc(UploadRecord.uploaded_at))
    )
    rows = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "filename": r.filename,
            "total_leads": r.total_leads,
            "hot_count": r.hot_count,
            "warm_count": r.warm_count,
            "cold_count": r.cold_count,
            "avg_score": r.avg_score,
            "model_version": r.model_version,
            "is_fallback": r.is_fallback,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
        }
        for r in rows
    ]


@router.get("/uploads/{upload_id}")
async def get_upload_detail(upload_id: str, db: AsyncSession = Depends(get_db)):
    """Get full detail of a single upload including all scored leads."""
    import uuid as _uuid

    try:
        uid = _uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID")

    result = await db.execute(
        select(UploadRecord).where(
            UploadRecord.id == uid, UploadRecord.deleted_at.is_(None)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")

    return {
        "id": str(record.id),
        "filename": record.filename,
        "total_leads": record.total_leads,
        "hot_count": record.hot_count,
        "warm_count": record.warm_count,
        "cold_count": record.cold_count,
        "avg_score": record.avg_score,
        "model_version": record.model_version,
        "is_fallback": record.is_fallback,
        "uploaded_at": record.uploaded_at.isoformat() if record.uploaded_at else None,
        "leads": record.results or [],
    }


@router.delete("/uploads/{upload_id}")
async def soft_delete_upload(upload_id: str, db: AsyncSession = Depends(get_db)):
    """Soft-delete an upload record (sets deleted_at timestamp)."""
    import uuid as _uuid

    try:
        uid = _uuid.UUID(upload_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid upload ID")

    result = await db.execute(
        select(UploadRecord).where(
            UploadRecord.id == uid, UploadRecord.deleted_at.is_(None)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Upload record not found")

    record.deleted_at = datetime.utcnow()
    await db.commit()

    return {"status": "deleted", "id": str(record.id)}
