"""
backend/ml/predict.py
────────────────────────────────────────────────────────────────
Inference module: loads the persisted XGBoost pipeline and
returns win-probability scores + tier classification.
Used by the workflow router and background scheduler.
"""

import json
from pathlib import Path
from functools import lru_cache
from typing import Optional

import numpy as np
import pandas as pd
import joblib

from core.config import get_settings
from core.logger import logger

settings = get_settings()

# Tier thresholds
HOT_THRESHOLD = 0.70
WARM_THRESHOLD = 0.40


def get_tier(score: float) -> str:
    if score >= HOT_THRESHOLD:
        return "Hot"
    elif score >= WARM_THRESHOLD:
        return "Warm"
    return "Cold"


@lru_cache(maxsize=1)
def load_model():
    """Load model once; cached after first call."""
    model_path = Path(settings.ML_MODEL_PATH)
    if not model_path.exists():
        logger.warning("ml_model_not_found", path=str(model_path))
        return None, None

    meta_path = model_path.parent / "metadata.json"
    metadata = json.loads(meta_path.read_text()) if meta_path.exists() else {}

    pipeline = joblib.load(model_path)
    logger.info("ml_model_loaded", version=metadata.get("model_version", "unknown"))
    return pipeline, metadata


def score_lead(lead_features: dict) -> dict:
    """
    Score a single lead.

    Args:
        lead_features: dict containing all required feature columns

    Returns:
        {
            "score": float,          # win probability 0-1
            "tier": str,             # Hot / Warm / Cold
            "model_version": str,
            "features_used": dict,   # snapshot of input features
            "is_fallback": bool,     # True if model unavailable
        }
    """
    pipeline, metadata = load_model()

    if pipeline is None:
        # ─── Deterministic Fallback ─────────────────────────────
        # Rule-based fallback when model isn't available
        score = _rule_based_fallback(lead_features)
        return {
            "score": score,
            "tier": get_tier(score),
            "model_version": "rule-based-fallback",
            "features_used": lead_features,
            "is_fallback": True,
        }

    row = pd.DataFrame([lead_features])

    # Derived features (same as training)
    row["activity_recency_score"] = 1 / (
        row.get("last_activity_days_ago", pd.Series([30])) + 1
    )
    row["meetings_ratio"] = row.get("total_meetings", pd.Series([0])) / (
        row.get("total_activities", pd.Series([1])) + 1
    )
    row["email_call_ratio"] = row.get("total_emails", pd.Series([0])) / (
        row.get("total_calls", pd.Series([1])) + 1
    )
    row["revenue_per_activity"] = row.get("expected_revenue", pd.Series([0])) / (
        row.get("total_activities", pd.Series([1])) + 1
    )

    STAGE_ORDER = {
        "New": 0,
        "Contacted": 1,
        "Proposal": 2,
        "Negotiation": 3,
        "Won": 4,
        "Lost": 5,
    }
    row["stage_ordinal"] = (
        row.get("stage", pd.Series(["New"])).map(STAGE_ORDER).fillna(0)
    )
    row["avg_sentiment"] = row.get("avg_sentiment", pd.Series([0.5]))
    row["note_count"] = row.get("note_count", pd.Series([0]))
    row["sentiment_volatility"] = row.get("sentiment_volatility", pd.Series([0]))

    score = float(pipeline.predict_proba(row)[0, 1])

    return {
        "score": round(score, 4),
        "tier": get_tier(score),
        "model_version": metadata.get("model_version", "unknown"),
        "features_used": lead_features,
        "is_fallback": False,
    }


def _rule_based_fallback(features: dict) -> float:
    """
    Deterministic fallback scoring.
    Uses stage position, activity recency, and sentiment.
    """
    stage_scores = {
        "New": 0.1,
        "Contacted": 0.3,
        "Proposal": 0.5,
        "Negotiation": 0.7,
        "Won": 1.0,
        "Lost": 0.0,
    }
    base = stage_scores.get(features.get("stage", "New"), 0.1)
    recency_boost = min(0.2, 10 / (features.get("last_activity_days_ago", 30) + 1))
    sentiment_boost = features.get("avg_sentiment", 0.5) * 0.1
    score = min(1.0, base + recency_boost + sentiment_boost)
    logger.info("rule_based_fallback_used", score=score)
    return score
