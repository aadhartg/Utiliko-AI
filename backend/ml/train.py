"""
backend/ml/train.py
────────────────────────────────────────────────────────────────
Task 1 — ML Pipeline: Train an XGBoost classifier on Utiliko
leads data to predict win probability (is_won label).

Features engineered from leads + activities + notes CSV files.
Run this script once to produce: ml/models/lead_scorer.joblib

Usage:
    python -m ml.train --data-dir /app/data
"""

import os
import argparse
import hashlib
import json
import warnings
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
import xgboost as xgb
import joblib

warnings.filterwarnings("ignore")


# ─── Feature Engineering ────────────────────────────────────────


def engineer_features(leads_df: pd.DataFrame, notes_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge aggregated note sentiment into leads and derive new features.
    """
    # Aggregate notes: mean sentiment per lead
    note_agg = (
        notes_df.groupby("lead_id")["sentiment_score"]
        .agg(["mean", "count", "std"])
        .rename(
            columns={
                "mean": "avg_sentiment",
                "count": "note_count",
                "std": "sentiment_volatility",
            }
        )
        .reset_index()
    )
    df = leads_df.merge(note_agg, on="lead_id", how="left")

    # Fill missing sentiment fields for leads with no notes
    df["avg_sentiment"] = df["avg_sentiment"].fillna(0.5)
    df["note_count"] = df["note_count"].fillna(0)
    df["sentiment_volatility"] = df["sentiment_volatility"].fillna(0)

    # Derived features
    df["activity_recency_score"] = 1 / (df["last_activity_days_ago"] + 1)
    df["meetings_ratio"] = df["total_meetings"] / (df["total_activities"] + 1)
    df["email_call_ratio"] = df["total_emails"] / (df["total_calls"] + 1)
    df["revenue_per_activity"] = df["expected_revenue"] / (df["total_activities"] + 1)

    return df


# ─── Stage ordinal encoding ──────────────────────────────────────

STAGE_ORDER = {
    "New": 0,
    "Contacted": 1,
    "Proposal": 2,
    "Negotiation": 3,
    "Won": 4,
    "Lost": 5,
}


def encode_stage(df: pd.DataFrame) -> pd.DataFrame:
    df["stage_ordinal"] = df["stage"].map(STAGE_ORDER).fillna(0)
    return df


# ─── Main Training Function ─────────────────────────────────────

NUMERIC_FEATURES = [
    "company_size",
    "expected_revenue",
    "stage_age_days",
    "total_activities",
    "total_emails",
    "total_calls",
    "total_meetings",
    "last_activity_days_ago",
    "avg_sentiment",
    "note_count",
    "sentiment_volatility",
    "activity_recency_score",
    "meetings_ratio",
    "email_call_ratio",
    "revenue_per_activity",
    "stage_ordinal",
]
CATEGORICAL_FEATURES = ["source", "industry"]


def build_pipeline() -> Pipeline:
    numeric_transformer = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )
    preprocessor = ColumnTransformer(
        [
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )
    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    return Pipeline([("preprocessor", preprocessor), ("classifier", model)])


def train(data_dir: str, output_dir: str) -> dict:
    data_dir = Path(data_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("📂 Loading CSVs...")
    leads_df = pd.read_csv(data_dir / "utiliko_leads_5000 (1).csv")
    notes_df = pd.read_csv(data_dir / "utiliko_notes_5000 (1).csv")

    print(f"   Leads: {len(leads_df):,} rows | Notes: {len(notes_df):,} rows")

    df = engineer_features(leads_df, notes_df)
    df = encode_stage(df)

    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df["is_won"].astype(int)

    print(f"   Class balance — Won: {y.sum()} / Total: {len(y)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    pipeline = build_pipeline()

    print("\n🏋️  Training XGBoost pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluation
    y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
    y_pred = pipeline.predict(X_test)
    auc = roc_auc_score(y_test, y_pred_proba)

    print(f"\n✅ ROC-AUC: {auc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["Lost", "Won"]))

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
    print(f"📊 5-Fold CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Feature importance (numeric only for simplicity)
    booster = pipeline.named_steps["classifier"]
    feature_importance = dict(
        zip(NUMERIC_FEATURES, booster.feature_importances_[: len(NUMERIC_FEATURES)])
    )
    top_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)[
        :5
    ]
    print("\n🔑 Top 5 Features:")
    for feat, imp in top_features:
        print(f"   {feat}: {imp:.4f}")

    # Persist model + metadata
    model_path = output_dir / "lead_scorer.joblib"
    joblib.dump(pipeline, model_path)

    # Generate a content hash for versioning
    with open(model_path, "rb") as f:
        model_hash = hashlib.md5(f.read()).hexdigest()[:8]

    metadata = {
        "model_version": f"xgb-{model_hash}",
        "roc_auc": round(auc, 4),
        "cv_auc_mean": round(cv_scores.mean(), 4),
        "cv_auc_std": round(cv_scores.std(), 4),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "top_features": top_features,
    }

    meta_path = output_dir / "metadata.json"
    meta_path.write_text(json.dumps(metadata, indent=2))

    print(f"\n💾 Model saved → {model_path}")
    print(f"📋 Metadata  → {meta_path}")
    print(f"🔖 Version   → {metadata['model_version']}")

    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Utiliko lead scoring model")
    parser.add_argument(
        "--data-dir", default="/app/data", help="Path to CSV data directory"
    )
    parser.add_argument(
        "--output-dir", default="/app/ml/models", help="Where to save model"
    )
    args = parser.parse_args()
    train(args.data_dir, args.output_dir)
