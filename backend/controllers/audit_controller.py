from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession


from core.database import get_db
from core.logger import logger
from models import AIAuditLog
from schemas import AuditEntry

router = APIRouter(prefix="/audit-log", tags=["Audit Log"])


@router.get("/", response_model=list[AuditEntry])
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
