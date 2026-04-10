"""
backend/jobs/scheduler.py
────────────────────────────────────────────────────────────────
Task 1 — Background Job Scheduler (APScheduler).

Jobs:
  1. score_all_leads     — every 6h: ML score all active leads
  2. cleanup_old_logs    — daily: archive audit logs > 90 days
  3. execute_approved    — every 5min: execute approved AI actions
  4. healthcheck_report  — every 1h: emit Prometheus-style metrics
"""

from datetime import datetime, timedelta
import asyncio

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import AsyncSessionLocal
from core.logger import logger
from models.workflow_models import Lead, AIAuditLog, AIAction, ActionStatus

scheduler = AsyncIOScheduler()


# ─── Job 1: Score All Active Leads ────────────────────────────


async def score_all_leads():
    """Re-score all leads that haven't been scored in >6h."""
    from services.ai_workflow import run_lead_scoring

    logger.info("job_start", job="score_all_leads")
    scored = 0
    errors = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Lead).where(Lead.stage.notin_(["Won", "Lost"]))
        )
        leads = result.scalars().all()

        for lead in leads:
            try:
                score_row = await run_lead_scoring(lead, db)
                scored += 1
                logger.debug(
                    "lead_scored", lead_id=str(lead.lead_id), score=score_row.score
                )
            except Exception as e:
                errors += 1
                logger.error("score_failed", lead_id=str(lead.lead_id), error=str(e))

        await db.commit()

    logger.info("job_complete", job="score_all_leads", scored=scored, errors=errors)


# ─── Job 2: Execute Approved Actions ──────────────────────────


async def execute_approved_actions():
    """Execute AI actions that have been approved but not yet run."""
    logger.info("job_start", job="execute_approved_actions")
    executed = 0

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AIAction).where(AIAction.status == ActionStatus.approved)
        )
        actions = result.scalars().all()

        for action in actions:
            try:
                # In production: dispatch to email/calendar/CRM APIs here
                action.status = ActionStatus.executed
                action.executed_at = datetime.utcnow()

                log = AIAuditLog(
                    event_type="action_executed",
                    entity_type="ai_action",
                    entity_id=str(action.action_id),
                    actor="scheduler",
                    detail={"action_type": action.action_type},
                    is_ai_generated=False,
                )
                db.add(log)
                executed += 1
            except Exception as e:
                action.status = ActionStatus.failed
                logger.error(
                    "action_exec_failed", action_id=str(action.action_id), error=str(e)
                )

        await db.commit()

    logger.info("job_complete", job="execute_approved_actions", executed=executed)


# ─── Job 3: Archive Old Audit Logs ────────────────────────────


async def cleanup_old_logs():
    """Move audit logs older than 90 days to archive (or just log the count)."""
    cutoff = datetime.utcnow() - timedelta(days=90)
    logger.info("job_start", job="cleanup_old_logs", cutoff=cutoff.isoformat())

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AIAuditLog).where(AIAuditLog.timestamp < cutoff)
        )
        old_logs = result.scalars().all()
        # In production: bulk INSERT into archive table, then DELETE
        logger.info("old_logs_found", count=len(old_logs))


# ─── Job 5: Auto-Draft Actions ────────────────────────────


async def auto_draft_actions():
    """Find Hot/Warm leads without actions and draft them."""
    from services.ai_workflow import draft_ai_action
    from models.workflow_models import AILeadScore

    logger.info("job_start", job="auto_draft_actions")
    drafted = 0

    async with AsyncSessionLocal() as db:
        # Complex query to find leads that have scores but no actions
        # We'll simplify: get leads with 'Hot' or 'Warm' scores that have 0 actions.
        # This is not perfectly efficient but works for a prototype.
        stmt = (
            select(Lead, AILeadScore)
            .join(AILeadScore, Lead.lead_id == AILeadScore.lead_id)
            .outerjoin(AIAction, Lead.lead_id == AIAction.lead_id)
            .where(
                and_(
                    AIAction.action_id.is_(None),  # No action exists yet
                    AILeadScore.tier.in_(["Hot", "Warm"]),
                )
            )
            .limit(20)  # Process in small batches
        )

        results = await db.execute(stmt)
        candidates = results.all()

        for lead, score in candidates:
            try:
                await draft_ai_action(lead, score, db)
                drafted += 1
            except Exception as e:
                logger.error(
                    "auto_draft_failed", lead_id=str(lead.lead_id), error=str(e)
                )

        await db.commit()

    logger.info("job_complete", job="auto_draft_actions", drafted=drafted)


# ─── Job 6: Health / Metrics Emit ─────────────────────────────


async def emit_metrics():
    """Emit monitoring metrics to logs (Prometheus scraper picks these up)."""
    async with AsyncSessionLocal() as db:
        from sqlalchemy import func
        from models.workflow_models import AILeadScore

        total_leads = (await db.execute(select(func.count(Lead.lead_id)))).scalar()
        pending_approvals = (
            await db.execute(
                select(func.count(AIAction.action_id)).where(
                    AIAction.status == ActionStatus.pending
                )
            )
        ).scalar()

        logger.info(
            "metrics",
            metric="utiliko_ai",
            total_active_leads=total_leads,
            pending_approvals=pending_approvals,
            timestamp=datetime.utcnow().isoformat(),
        )


# ─── Scheduler Setup ──────────────────────────────────────────


def start_scheduler():
    scheduler.add_job(
        score_all_leads,
        trigger=IntervalTrigger(hours=6),
        id="score_all_leads",
        replace_existing=True,
        misfire_grace_time=300,
    )
    scheduler.add_job(
        auto_draft_actions,
        trigger=IntervalTrigger(seconds=30),  # Check frequently
        id="auto_draft_actions",
        replace_existing=True,
    )
    scheduler.add_job(
        execute_approved_actions,
        trigger=IntervalTrigger(minutes=5),
        id="execute_approved_actions",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.add_job(
        emit_metrics,
        trigger=IntervalTrigger(hours=1),
        id="emit_metrics",
        replace_existing=True,
    )
    scheduler.add_job(
        cleanup_old_logs,
        trigger=CronTrigger(hour=2, minute=0),  # 2am daily
        id="cleanup_old_logs",
        replace_existing=True,
    )
    scheduler.add_job(
        emit_metrics,
        trigger=IntervalTrigger(hours=1),
        id="emit_metrics",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler_started", jobs=len(scheduler.get_jobs()))


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("scheduler_stopped")
