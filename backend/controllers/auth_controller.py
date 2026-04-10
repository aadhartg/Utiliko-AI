# backend/controllers/auth_controller.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
import uuid

from core.database import get_db
from models.lms_core import User, RoleEnum
from core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    department_id: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str


async def get_current_user(
    authorization: str = Header(None), db: AsyncSession = Depends(get_db)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    token = authorization.split("Bearer ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token invalid or expired")

    result = await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Inactivity check (2 hours)
    if user.last_active_at:
        now = datetime.utcnow()
        if now - user.last_active_at > timedelta(hours=2):
            raise HTTPException(status_code=401, detail="Session expired due to inactivity")

    # Update last active time
    user.last_active_at = datetime.utcnow()
    await db.commit()

    return user


async def get_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != RoleEnum.super_admin:
        raise HTTPException(status_code=403, detail="Super Admin privileges required")
    return user


@router.post("/login", response_model=AuthResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value}
    )
    # Update last active time on login
    user.last_active_at = datetime.utcnow()
    await db.commit()

    return AuthResponse(
        access_token=access_token, user_id=str(user.id), role=user.role.value
    )


@router.post("/register/employee")
async def register_employee(
    req: RegisterRequest,
    admin: User = Depends(get_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Only super admins can register employees."""
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    dep_uuid = uuid.UUID(req.department_id) if req.department_id else None

    new_user = User(
        email=req.email,
        password_hash=get_password_hash(req.password),
        full_name=req.full_name,
        role=RoleEnum.employee,
        department_id=dep_uuid,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"message": "Employee created successfully", "user_id": str(new_user.id)}


@router.get("/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "department_id": (
            str(current_user.department_id) if current_user.department_id else None
        ),
    }

@router.get("/employees")
async def list_employees(
    skip: int = 0, limit: int = 10,
    admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func
    count_res = await db.execute(select(func.count(User.id)).where(User.role == RoleEnum.employee))
    total = count_res.scalar_one()

    result = await db.execute(
        select(User).where(User.role == RoleEnum.employee).offset(skip).limit(limit)
    )
    emps = result.scalars().all()
    data = [{
        "id": str(e.id),
        "email": e.email,
        "full_name": e.full_name,
        "is_active": e.is_active,
        "department_id": str(e.department_id) if e.department_id else None
    } for e in emps]
    return {"data": data, "total": total}


@router.put("/employees/{user_id}/toggle")
async def toggle_employee(user_id: str, admin: User = Depends(get_super_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    emp = result.scalar_one_or_none()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.is_active = not emp.is_active
    await db.commit()
    return {"status": "success", "is_active": emp.is_active}
