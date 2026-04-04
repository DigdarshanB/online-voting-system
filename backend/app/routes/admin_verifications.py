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
from app.models.totp_recovery_request import TotpRecoveryRequest
from app.models.user import User
from app.services.totp_recovery_delivery import (
    send_totp_recovery_completed_notice,
    send_totp_recovery_rejected_notice,
)
from app.services.auth_audit import audit_auth_event

import logging

router = APIRouter(prefix="/admin/verifications", tags=["admin-verifications"])
logger = logging.getLogger(__name__)


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
    id: int
    user_id: int
    email: str
    role: str
    status: str
    requested_ip: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


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
    audit_auth_event(
        action="ACCOUNT_APPROVED",
        actor_user_id=_sa.id,
        target_user_id=user.id,
        metadata={"target_role": user.role, "new_status": user.status},
    )
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
    user.token_version += 1
    db.commit()
    audit_auth_event(
        action="ACCOUNT_REJECTED",
        actor_user_id=_sa.id,
        target_user_id=user.id,
        metadata={"target_role": user.role, "reason": payload.reason},
    )
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
    user.token_version += 1
    db.commit()
    return {"success": True}


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
    user.token_version += 1
    db.commit()
    return {"success": True}


# ── POST /admin/verifications/recovery/{user_id}/reset-totp ────

@router.post("/recovery/{user_id}/reset-totp")
def reset_admin_totp(
    user_id: int,
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    """Force-reset an admin's TOTP so they can re-enrol (e.g. lost phone)."""
    user = _get_admin_or_404(user_id, db)

    user.totp_secret = None
    user.totp_enabled_at = None
    user.status = "PENDING_MFA"
    user.token_version += 1
    db.commit()
    audit_auth_event(
        action="TOTP_RESET",
        actor_user_id=_sa.id,
        target_user_id=user.id,
        metadata={"method": "super_admin_forced_reset", "status": user.status},
    )
    return {"success": True, "status": user.status}


# ── GET /admin/verifications/recovery/pending ────────────────

@router.get("/recovery/pending", response_model=list[TotpRecoveryQueueItem])
def list_pending_totp_recoveries(
    db: Session = Depends(get_db),
    _sa: User = Depends(_require_super_admin),
):
    rows = db.execute(
        select(TotpRecoveryRequest).where(
            TotpRecoveryRequest.status == "PENDING_APPROVAL",
            TotpRecoveryRequest.role.in_(["admin", "super_admin"]),
        )
    ).scalars().all()
    return rows


# ── POST /admin/verifications/recovery/{request_id}/approve ───

@router.post("/recovery/{request_id}/approve")
def approve_totp_recovery_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    req = db.execute(
        select(TotpRecoveryRequest).where(TotpRecoveryRequest.id == request_id)
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Recovery request not found")
    if req.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="Recovery request is not pending approval")

    user = _get_admin_or_404(req.user_id, db)

    user.totp_secret = None
    user.totp_enabled_at = None
    user.status = "PENDING_MFA"
    user.token_version += 1

    req.status = "COMPLETED"
    req.resolved_by_user_id = current_user.id
    req.resolved_at = datetime.now(timezone.utc)
    req.resolution_note = "Approved by super admin"

    db.commit()

    try:
        send_totp_recovery_completed_notice(user.email)
    except Exception:
        logger.exception("Failed to send TOTP recovery completion notice user_id=%s", user.id)

    logger.info(
        "TOTP recovery approved request_id=%s user_id=%s approved_by=%s",
        req.id,
        user.id,
        current_user.id,
    )
    audit_auth_event(
        action="TOTP_RESET",
        actor_user_id=current_user.id,
        target_user_id=user.id,
        metadata={"method": "super_admin_approval", "recovery_request_id": req.id},
    )
    return {"success": True, "status": req.status}


# ── POST /admin/verifications/recovery/{request_id}/reject ────

@router.post("/recovery/{request_id}/reject")
def reject_totp_recovery_request(
    request_id: int,
    payload: RecoveryRejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_super_admin),
):
    req = db.execute(
        select(TotpRecoveryRequest).where(TotpRecoveryRequest.id == request_id)
    ).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Recovery request not found")
    if req.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail="Recovery request is not pending approval")

    user = _get_admin_or_404(req.user_id, db)
    user.token_version += 1

    req.status = "REJECTED"
    req.resolved_by_user_id = current_user.id
    req.resolved_at = datetime.now(timezone.utc)
    req.resolution_note = (payload.reason or "Rejected by super admin")[:500]

    db.commit()

    try:
        send_totp_recovery_rejected_notice(user.email)
    except Exception:
        logger.exception("Failed to send TOTP recovery rejection notice user_id=%s", user.id)

    logger.info(
        "TOTP recovery rejected request_id=%s user_id=%s rejected_by=%s",
        req.id,
        user.id,
        current_user.id,
    )
    audit_auth_event(
        action="TOTP_RESET_REJECTED",
        actor_user_id=current_user.id,
        target_user_id=user.id,
        metadata={"recovery_request_id": req.id, "reason": req.resolution_note},
    )
    return {"success": True, "status": req.status}
