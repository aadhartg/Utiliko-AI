# backend/core/logger.py
import structlog
import logging
from .config import get_settings

settings = get_settings()


def configure_logging():
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(level=log_level)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )


logger = structlog.get_logger()
