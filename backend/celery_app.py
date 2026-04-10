# backend/celery_app.py
from celery import Celery
from core.config import settings

celery_app = Celery(
    "utiliko_ai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["jobs.scheduler"],  # Include modules where tasks are defined
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
)

if __name__ == "__main__":
    celery_app.start()
