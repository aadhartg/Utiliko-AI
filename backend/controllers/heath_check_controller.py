from fastapi import APIRouter, Depends, HTTPException, status as HTTPStatus
from sqlalchemy.orm import Session
from sqlalchemy import text

from schemas import MessageResponse
from core.database import get_db  # your sync session dependency
from app.core.redis import redis_client

health_check_router = APIRouter(
    prefix="/health_check", tags=["Health Check"], include_in_schema=True
)


@health_check_router.get(
    "",
    summary="Health Check",
    description="Validates the health of the project.",
    response_model=MessageResponse,
)
def health_check(db: Session = Depends(get_db)):
    """
    This endpoint validates the health of the project.

    It is used to ensure that the subdomain setup is functioning correctly.
    """
    try:
        result = db.execute(text("SELECT 1"))
        one = result.scalar_one_or_none()
        if one == 1:
            return MessageResponse(
                message="200 Ok Validated.", status_code=HTTPStatus.HTTP_200_OK
            )

        return MessageResponse(
            message="500 Internal Server Error",
            status_code=HTTPStatus.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        raise HTTPException(
            detail="Internal Server Error",
            status_code=HTTPStatus.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from e


@health_check_router.get("/redis")
def redis_health():
    try:
        redis_client.ping()
        return {"redis": "connected"}
    except Exception as e:
        return {"redis": "error", "detail": str(e)}
