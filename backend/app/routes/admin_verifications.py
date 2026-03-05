"""
Admin verification / approval endpoints (super_admin only).

Routes:
  GET    /admin/verifications/pending-admins
  POST   /admin/verifications/{user_id}/approve
  POST   /admin/verifications/{user_id}/reject
  DELETE /admin/verifications/{user_id}
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User

router = APIRouter(prefix="/admin/verifications", tags=["admin-verifications"])


# ── Helpers ─────────────────────────────────────────────────────

def _require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


def _get_admin_or_404(user_id: int, db: Session) -> User:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "admin":
        raise HTTPException(status_code=400, detail="Target user is not an admin")
    return user


# ── DTOs ────────────────────────────────────────────────────────

class PendingAdminItem(BaseModel):
    id: int
    full_name: Optional[str]
    phone_number: Optional[str]
    citizenship_no_normalized: Optional[str]
    status: str
    totp_enabled_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

    class Config:
        from_attributes = True


class RejectRequest(BaseModel):
    reason: str


# ── GET /admin/verifications/pending-admins ─────────────────────

@router.get("/pending-admins", response_model=list[PendingAdminItem])
def list_pending_admins(
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """List admin accounts awaiting MFA setup or super-admin approval."""
    rows = db.execute(
        select(User).where(
            User.role == "admin",
            User.status.in_(["PENDING_MFA", "PENDING_APPROVAL"]),
        )
    ).scalars().all()
    return rows


# ── POST /admin/verifications/{user_id}/approve ────────────────

@router.post("/{user_id}/approve")
def approve_admin(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    user = _get_admin_or_404(user_id, db)

    if user.status not in ("PENDING_APPROVAL", "PENDING_MFA"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve admin with status '{user.status}'",
        )

    user.status = "ACTIVE"
    user.approved_at = datetime.now(timezone.utc)
    user.rejection_reason = None
    db.commit()
    return {"success": True, "status": user.status}


# ── POST /admin/verifications/{user_id}/reject ─────────────────

@router.post("/{user_id}/reject")
def reject_admin(
    user_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    user = _get_admin_or_404(user_id, db)

    if user.status not in ("PENDING_APPROVAL", "PENDING_MFA", "ACTIVE"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject admin with status '{user.status}'",
        )

    user.status = "REJECTED"
    user.rejection_reason = payload.reason
    user.approved_at = None
    db.commit()
    return {"success": True, "status": user.status}


# ── DELETE /admin/verifications/{user_id} ───────────────────────

@router.delete("/{user_id}")
def delete_pending_admin(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Soft-delete a pending/rejected admin (marks as REJECTED)."""
    user = _get_admin_or_404(user_id, db)

    if user.status not in ("PENDING_MFA", "PENDING_APPROVAL", "REJECTED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete admin with status '{user.status}'. Only pending or rejected admins can be removed.",
        )

    user.status = "REJECTED"
    user.rejection_reason = "Deleted by super admin"
    user.approved_at = None
    db.commit()
    return {"success": True}


# ── DTOs (active admins) ───────────────────────────────────────

class ActiveAdminItem(BaseModel):
    id: int
    full_name: Optional[str]
    phone_number: Optional[str]
    citizenship_no_normalized: Optional[str]
    approved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── GET /admin/verifications/active-admins ──────────────────────

@router.get("/active-admins", response_model=list[ActiveAdminItem])
def list_active_admins(
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """List admin accounts with status ACTIVE."""
    rows = db.execute(
        select(User).where(
            User.role == "admin",
            User.status == "ACTIVE",
        )
    ).scalars().all()
    return rows


# ── DELETE /admin/verifications/active-admins/{user_id} ────────

@router.delete("/active-admins/{user_id}")
def disable_active_admin(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Soft-disable an active admin (sets status to REJECTED)."""
    user = _get_admin_or_404(user_id, db)

    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=f"Admin is not ACTIVE (current status: '{user.status}'). Cannot disable.",
        )

    user.status = "REJECTED"
    user.rejection_reason = "Deleted by super admin"
    user.approved_at = None
    db.commit()
    return {"success": True}
