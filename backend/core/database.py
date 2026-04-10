# backend/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.environment == "development",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase


class BaseMixin:
    """Utility mixin for SQLAlchemy models."""

    def __repr__(self):
        fields = ", ".join(
            f"{c.key}={getattr(self, c.key)!r}"
            for c in inspect(self).mapper.column_attrs
        )
        return f"<{self.__class__.__name__}({fields})>"

    def to_dict(self):
        return {c.key: getattr(self, c.key) for c in inspect(self).mapper.column_attrs}


class Base(DeclarativeBase, BaseMixin):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    """Create all tables on startup."""
    from models import workflow_models, lms_models, lms_core  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
