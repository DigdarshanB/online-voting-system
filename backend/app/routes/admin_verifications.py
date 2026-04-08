"""
Admin verification / approval endpoints (super_admin only).

Routes:
  GET    /admin/verifications/pending-admins
  POST   /admin/verifications/{user_id}/approve
  POST   /admin/verifications/{user_id}/reject
  DELETE /admin/verifications/{user_id}
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User
from app.services.verification_service import (
    list_pending_admins,
    approve_admin,
    reject_admin,
    remove_pending_admin_record,
    list_active_admins,
    disable_active_admin,
    reset_admin_totp,
    list_pending_totp_recoveries,
    approve_totp_recovery,
    reject_totp_recovery,
)

router = APIRouter(prefix="/admin/verifications", tags=["admin-verifications"])


# ── Helpers ─────────────────────────────────────────────────────

def _require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


# ── DTOs ────────────────────────────────────────────────────────

class PendingAdminItem(BaseModel):
    id: int
    email: Optional[str]
    full_name: Optional[str]
    phone_number: Optional[str]
    citizenship_no_normalized: Optional[str]
    status: str
    role: str
    totp_enabled_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

    class Config:
        from_attributes = True


class RejectRequest(BaseModel):
    reason: str


class RecoveryRejectRequest(BaseModel):
    reason: str | None = None


class TotpRecoveryQueueItem(BaseModel):
    request_id: int
    user_id: int
    full_name: str
    email: str
    status: str
    requested_at: datetime
    requested_ip: Optional[str]

    class Config:
        from_attributes = True


# ── GET /admin/verifications/pending-admins ─────────────────────

@router.get("/pending-admins", response_model=list[PendingAdminItem])
def list_pending_admins_route(
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """List admin accounts awaiting MFA setup or super-admin approval."""
    return list_pending_admins(db)


# ── POST /admin/verifications/{user_id}/approve ────────────────

@router.post("/{user_id}/approve", response_model=dict)
def approve_admin_route(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    return approve_admin(user_id, _sa, db)


# ── POST /admin/verifications/{user_id}/reject ─────────────────

@router.post("/{user_id}/reject", response_model=dict)
def reject_admin_route(
    user_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    return reject_admin(user_id, payload.reason, _sa, db)


# ── DELETE /admin/verifications/{user_id} ───────────────────────

@router.delete("/{user_id}/remove-record", response_model=dict)
def remove_pending_admin_record_route(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Removes a pending or rejected admin record (cleanup action)."""
    return remove_pending_admin_record(user_id, _sa, db)


# ── DTOs (active admins) ───────────────────────────────────────

class ActiveAdminItem(BaseModel):
    id: int
    email: Optional[str]
    full_name: Optional[str]
    phone_number: Optional[str]
    citizenship_no_normalized: Optional[str]
    role: str
    approved_at: Optional[datetime]
    totp_enabled_at: Optional[datetime]

    class Config:
        from_attributes = True

class DisableAccessPayload(BaseModel):
    reason: str


# ── GET /admin/verifications/active-admins ──────────────────────

@router.get("/active-admins", response_model=list[ActiveAdminItem])
def list_active_admins_route(
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """List admin accounts with status ACTIVE."""
    return list_active_admins(db)


# ── POST /admin/verifications/active-admins/{user_id}/disable-access ───

@router.post("/active-admins/{user_id}/disable-access")
def disable_active_admin_route(
    user_id: int,
    payload: DisableAccessPayload,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Soft-disable an active admin (sets status to DISABLED)."""
    return disable_active_admin(user_id, payload.reason, _sa, db)


# ── POST /admin/verifications/recovery/{user_id}/reset-totp ────

@router.post("/recovery/{user_id}/reset-totp")
def reset_admin_totp_route(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Force-reset an admin's TOTP so they can re-enrol (e.g. lost phone)."""
    return reset_admin_totp(user_id, _sa, db)


# ── GET /admin/verifications/recovery/pending ────────────────

@router.get("/recovery/pending", response_model=list[TotpRecoveryQueueItem])
def list_pending_totp_recoveries_route(
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Lists pending TOTP recovery requests specifically for 'admin' role users."""
    return list_pending_totp_recoveries(db)


# ── POST /admin/verifications/recovery/{request_id}/approve ───

@router.post("/recovery/{request_id}/approve", response_model=dict)
def approve_totp_recovery_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    return approve_totp_recovery(request_id, current_user, db)


# ── POST /admin/verifications/recovery/{request_id}/reject ────

@router.post("/recovery/{request_id}/reject", response_model=dict)
def reject_totp_recovery_request(
    request_id: int,
    payload: RecoveryRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    return reject_totp_recovery(request_id, payload.reason, current_user, db)
