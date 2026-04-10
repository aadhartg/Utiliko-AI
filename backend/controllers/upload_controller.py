import uuid as _uuid
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd

from core.database import get_db
from core.logger import logger
from models.workflow_models import UploadRecord, Lead, AILeadScore, AIAuditLog
from ml.predict import score_lead

router = APIRouter(prefix="/workflow", tags=["AI Workflow"])


@router.post("/upload-score")
async def upload_and_score(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a CSV/Excel file of leads, run them through the ML scoring
    pipeline, save results to DB, and return scored results.
    """
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

    # 1. Pre-process UUIDs and collect IDs for bulk fetch
    lead_data_list = []
    incoming_ids = []
    for _, row in df.iterrows():
        lead_id_str = str(row.get("lead_id", ""))
        l_uuid = None
        if lead_id_str:
            try:
                l_uuid = _uuid.UUID(lead_id_str)
            except ValueError:
                l_uuid = _uuid.uuid4()
        else:
            l_uuid = _uuid.uuid4()

        incoming_ids.append(l_uuid)
        lead_data_list.append((l_uuid, row))

    # 2. Bulk Fetch Existing Leads
    existing_leads_stmt = await db.execute(
        select(Lead).where(Lead.lead_id.in_(incoming_ids))
    )
    existing_leads_map = {l.lead_id: l for l in existing_leads_stmt.scalars().all()}

    # 3. Process, Score, and Prepare DB Objects
    results = []
    to_add = []
    default_tenant_id = _uuid.UUID("00000000-0000-0000-0000-000000000000")

    for l_uuid, row in lead_data_list:
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

        res_dict = {
            "lead_id": str(l_uuid),
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
        results.append(res_dict)

        # Sync Lead
        lead_obj = existing_leads_map.get(l_uuid)
        if not lead_obj:
            lead_obj = Lead(
                lead_id=l_uuid,
                tenant_id=default_tenant_id,
                source=features["source"],
                industry=features["industry"],
                company_size=features["company_size"],
                expected_revenue=features["expected_revenue"],
                stage=features["stage"],
            )
            to_add.append(lead_obj)
        else:
            lead_obj.company_size = features["company_size"]
            lead_obj.expected_revenue = features["expected_revenue"]
            lead_obj.stage = features["stage"]

        # Create Score
        to_add.append(
            AILeadScore(
                lead_id=l_uuid,
                score=score_result["score"],
                tier=score_result["tier"],
                model_version=score_result["model_version"],
                features_snapshot=features,
            )
        )

        # Audit Log
        to_add.append(
            AIAuditLog(
                event_type="score_computed",
                entity_type="lead",
                entity_id=str(l_uuid),
                actor="system",
                detail={"score": score_result["score"], "tier": score_result["tier"]},
                is_ai_generated=True,
            )
        )

    results.sort(key=lambda x: x["score"], reverse=True)

    # 4. Final Summary and Upload Record
    total = len(results)
    hot = sum(1 for r in results if r["tier"] == "Hot")
    warm = sum(1 for r in results if r["tier"] == "Warm")
    cold = sum(1 for r in results if r["tier"] == "Cold")
    avg = round(sum(r["score"] for r in results) / max(total, 1), 4)

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
    to_add.append(record)

    db.add_all(to_add)
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


@router.get("/uploads")
async def list_uploads(
    db: AsyncSession = Depends(get_db)
):
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
async def get_upload_detail(
    upload_id: str,
    db: AsyncSession = Depends(get_db)
):
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
async def soft_delete_upload(
    upload_id: str,
    db: AsyncSession = Depends(get_db)
):
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
