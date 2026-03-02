from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.deps import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token
from app.utils.citizenship import normalize_citizenship_number

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    full_name: str
    phone_number: str
    citizenship_number: str
    password: str

class LoginRequest(BaseModel):
    citizenship_number: str
    password: str

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    normalized = normalize_citizenship_number(payload.citizenship_number)

    existing = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Citizenship number already registered")

    user = User(
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        citizenship_no_raw=payload.citizenship_number,
        citizenship_no_normalized=normalized,
        hashed_password=hash_password(payload.password),
        role="voter",
        status="ACTIVE",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "citizenship_no": user.citizenship_no_normalized, "role": user.role}

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    normalized = normalize_citizenship_number(payload.citizenship_number)

    user = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")

    token = create_access_token(subject=str(user.id), role=user.role)
    return {"access_token": token, "token_type": "bearer"}
