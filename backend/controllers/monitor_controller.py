from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession


from core.database import get_db
from core.logger import logger
from models.workflow_models import AILeadScore, AIAction, ActionStatus, Lead
from schemas import MonitorSnapshot

router = APIRouter(prefix="/monitor", tags=["Monitoring"])


@router.get("/", response_model=MonitorSnapshot)
async def get_monitor(
    db: AsyncSession = Depends(get_db)
):
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
