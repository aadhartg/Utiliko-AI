"""
backend/main.py — FastAPI application entry point
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_client import make_asgi_app

from core.config import settings
from core.database import create_tables
from core.logger import configure_logging, logger
from jobs.scheduler import start_scheduler, stop_scheduler
from controllers import api_router

settings = settings
configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────
    logger.info("app_starting", environment=settings.PYTHON_ENV)
    await create_tables()

    # ── LMS Super Admin Seed ─────────────────────────
    from core.database import async_sessionmaker, engine
    from core.security import get_password_hash
    from models.lms_core import User, RoleEnum
    from sqlalchemy.future import select
    from sqlalchemy.ext.asyncio import AsyncSession

    AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(User).where(User.role == RoleEnum.super_admin)
            )
            if not result.scalar_one_or_none():
                new_admin = User(
                    email="admin@utiliko.io",
                    password_hash=get_password_hash("admin123"),
                    full_name="Super Admin",
                    role=RoleEnum.super_admin,
                )
                session.add(new_admin)
                await session.commit()
                logger.info("seeded_super_admin")
        except Exception as e:
            logger.error("seed_failed", error=str(e))
    start_scheduler()
    logger.info("app_ready")
    yield
    # ── Shutdown ─────────────────────────────────────
    stop_scheduler()
    logger.info("app_stopped")


app = FastAPI(
    title=settings.APP,
    description="AI Workflow + LMS Platform for Utiliko",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(api_router, prefix="/api")

# Static files (certificates, badges)
import pathlib

pathlib.Path(settings.CERT_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
pathlib.Path(settings.BADGE_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0", "env": settings.environment}
