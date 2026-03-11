from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import settings
from app.db.deps import get_db
from app.models.user import User

_bearer = HTTPBearer()


def create_access_token(subject: str, role: str, token_version: int = 0) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "role": role,
        "tv": token_version,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ── Activation tokens (invite links) ───────────────────────────

def create_activation_token(invite_id: int, expires_at: datetime) -> str:
    """Create a short-lived JWT that encodes an invite_id for activation links."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(invite_id),
        "purpose": "invite_activation",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_activation_token(token: str) -> int:
    """Decode an activation token and return the invite_id.

    Raises HTTPException(400) on invalid/expired tokens.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired activation token")

    if payload.get("purpose") != "invite_activation":
        raise HTTPException(status_code=400, detail="Invalid activation token")

    invite_id = payload.get("sub")
    if invite_id is None:
        raise HTTPException(status_code=400, detail="Invalid activation token payload")

    return int(invite_id)


# ── User auth dependency ────────────────────────────────────────

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated User row."""
    try:
        payload = jwt.decode(creds.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.execute(select(User).where(User.id == int(user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    token_version = payload.get("tv", 0)
    if token_version != user.token_version:
        raise HTTPException(status_code=401, detail="Token has been invalidated")
    return user
