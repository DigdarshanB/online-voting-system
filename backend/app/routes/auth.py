import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.deps import get_db
from app.models.admin_invite import AdminInvite
from app.models.user import User
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, get_current_user
from app.utils.citizenship import normalize_citizenship_number

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    full_name: str
    phone_number: str
    citizenship_number: str
    password: str
    role: str | None = None

class LoginRequest(BaseModel):
    citizenship_number: str
    password: str


class AdminActivateRequest(BaseModel):
    invite_code: str
    full_name: str
    phone_number: str
    citizenship_number: str
    password: str

@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # --- Segment A0.1: block admin self-registration ---
    if payload.role and payload.role.lower() in ("admin", "super_admin"):
        raise HTTPException(
            status_code=403,
            detail="Public registration cannot create admin accounts",
        )
    # Force voter role regardless of any supplied value
    resolved_role = "voter"
    # -----------------------------------------------

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
        role=resolved_role,
        status="ACTIVE",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "citizenship_no": user.citizenship_no_normalized, "role": user.role}

@router.post("/admin/activate")
def admin_activate(payload: AdminActivateRequest, db: Session = Depends(get_db)):
    """Activate an admin account using a one-time invite code."""
    code_hash = hashlib.sha256(payload.invite_code.encode()).hexdigest()

    invite = db.execute(
        select(AdminInvite).where(AdminInvite.code_hash == code_hash)
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid invite code")
    if invite.used_at is not None:
        raise HTTPException(status_code=400, detail="Invite code already used")
    if invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite code has expired")

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
        role="admin",
        status="PENDING_VERIFICATION",
    )
    db.add(user)

    invite.used_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "citizenship_no": user.citizenship_no_normalized,
        "role": user.role,
        "status": user.status,
    }


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


@router.post("/admin/login")
def admin_login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Admin-only login gate: rejects voters before issuing a token."""
    normalized = normalize_citizenship_number(payload.citizenship_number)

    user = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # --- Segment A3.1: role gate ---
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Access denied: admin accounts only")
    # --------------------------------

    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")

    token = create_access_token(subject=str(user.id), role=user.role)
    return {"access_token": token, "token_type": "bearer"}


# ── GET /auth/me ────────────────────────────────────────────────

class MeResponse(BaseModel):
    id: int
    role: str
    status: str
    totp_enabled: bool


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return MeResponse(
        id=current_user.id,
        role=current_user.role,
        status=current_user.status,
        totp_enabled=current_user.totp_enabled_at is not None,
    )

