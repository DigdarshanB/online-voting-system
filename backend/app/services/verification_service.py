"""Verification service – admin/voter approval/rejection, TOTP recovery queue, voter management."""

import hashlib
import logging
import secrets
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException, Request
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.email_verification import EmailVerification
from app.models.password_reset_code import PasswordResetCode
from app.models.pending_voter_registration import PendingVoterRegistration
from app.models.totp_recovery_request import TotpRecoveryRequest
from app.models.user import User
from app.models.ballot import Ballot
from app.repositories import pending_registration_repository, totp_recovery_repository, user_repository
from app.services.auth_audit import audit_auth_event
from app.services.email_delivery import EmailDeliveryError
from app.services.email_verification_delivery import send_email_verification_with_fallback
from app.services.password_reset_delivery import send_password_reset_code
from app.services.totp_recovery_delivery import (
    send_totp_recovery_completed_notice,
    send_totp_recovery_rejected_notice,
)

logger = logging.getLogger(__name__)


# ── Admin governance helpers ────────────────────────────────────

def get_admin_or_404(user_id: int, db: Session) -> User:
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Governance rule: Super admin accounts cannot be modified through this interface.",
        )
    if user.role != "admin":
        raise HTTPException(status_code=400, detail="Target user is not a standard administrator")
    return user


def get_voter_or_404(user_id: int, db: Session) -> User:
    user = user_repository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "voter":
        raise HTTPException(status_code=400, detail="Target user is not a voter")
    return user


# ── Admin account verification ──────────────────────────────────

def list_pending_admins(db: Session) -> list[User]:
    return user_repository.list_users_by_role_and_statuses(
        db, "admin", ["PENDING_MFA", "PENDING_APPROVAL"]
    )


def approve_admin(user_id: int, actor: User, db: Session) -> dict:
    user = get_admin_or_404(user_id, db)
    if user.status not in ("PENDING_APPROVAL", "PENDING_MFA"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve this administrator. Their current status is '{user.status}', not 'PENDING_APPROVAL' or 'PENDING_MFA'.",
        )

    user.status = "ACTIVE"
    user.approved_at = datetime.now(timezone.utc)
    user.rejection_reason = None
    db.commit()
    audit_auth_event(
        action="ACCOUNT_APPROVED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"target_role": user.role, "new_status": user.status},
    )
    return {"status": "success", "message": f"Administrator {user.email} has been approved and is now active."}


def reject_admin(user_id: int, reason: str, actor: User, db: Session) -> dict:
    user = get_admin_or_404(user_id, db)
    if user.status not in ("PENDING_APPROVAL", "PENDING_MFA"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject this administrator. Their current status is '{user.status}', not 'PENDING_APPROVAL' or 'PENDING_MFA'.",
        )

    user.status = "REJECTED"
    user.rejection_reason = reason
    user.approved_at = None
    user.token_version += 1
    db.commit()
    audit_auth_event(
        action="ACCOUNT_REJECTED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"target_role": user.role, "reason": reason},
    )
    return {"status": "success", "message": f"Administrator enrollment for {user.email} has been rejected."}


def remove_pending_admin_record(user_id: int, actor: User, db: Session) -> dict:
    user = get_admin_or_404(user_id, db)
    if user.status not in ("PENDING_MFA", "PENDING_APPROVAL", "REJECTED"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot remove this record. Admin status is '{user.status}'. Only 'PENDING' or 'REJECTED' records can be removed.",
        )

    user.status = "REJECTED"
    user.rejection_reason = "Administrative removal (record cleanup)"
    user.approved_at = None
    user.token_version += 1
    db.commit()
    audit_auth_event(
        action="ACCOUNT_RECORD_REMOVED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"target_role": user.role, "reason": "Administrative cleanup"},
    )
    return {"status": "success", "message": f"The record for {user.email} has been removed from the pending queue."}


def list_active_admins(db: Session) -> list[User]:
    return user_repository.list_users_by_role_and_status(db, "admin", "ACTIVE")


def disable_active_admin(user_id: int, reason: str, actor: User, db: Session) -> dict:
    user = get_admin_or_404(user_id, db)
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail=f"Admin is not ACTIVE (current status: '{user.status}'). Cannot disable.",
        )

    user.status = "DISABLED"
    user.disabled_at = datetime.now(timezone.utc)
    user.disabled_by_user_id = actor.id
    user.rejection_reason = reason
    user.approved_at = None
    user.token_version += 1
    db.commit()
    audit_auth_event(
        action="ACCOUNT_DISABLED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"target_role": user.role, "reason": reason},
    )
    return {"success": True, "status": user.status}


def reset_admin_totp(user_id: int, actor: User, db: Session) -> dict:
    user = get_admin_or_404(user_id, db)
    user.totp_secret = None
    user.totp_enabled_at = None
    user.status = "PENDING_MFA"
    user.token_version += 1
    db.commit()
    audit_auth_event(
        action="TOTP_RESET",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"method": "super_admin_forced_reset", "status": user.status},
    )
    return {"success": True, "status": user.status}


# ── TOTP recovery queue ────────────────────────────────────────

def list_pending_totp_recoveries(db: Session) -> list:
    return totp_recovery_repository.list_pending_admin_recoveries(db)


def approve_totp_recovery(request_id: int, actor: User, db: Session) -> dict:
    req = totp_recovery_repository.get_request_by_id(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Recovery request not found.")
    if req.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail=f"Request is not pending approval (status: {req.status}).")

    user = get_admin_or_404(req.user_id, db)

    user.totp_secret = None
    user.totp_enabled_at = None
    user.status = "PENDING_MFA"
    user.token_version += 1

    req.status = "COMPLETED"
    req.resolved_by_user_id = actor.id
    req.resolved_at = datetime.now(timezone.utc)
    req.resolution_note = "Approved by super admin."
    db.commit()

    try:
        send_totp_recovery_completed_notice(user.email)
    except Exception:
        logger.exception("Failed to send TOTP recovery completion notice to user_id=%s", user.id)

    audit_auth_event(
        action="TOTP_RECOVERY_APPROVED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"recovery_request_id": req.id},
    )
    return {"status": "success", "message": f"Recovery for {user.email} approved. User must re-enroll MFA on next login."}


def reject_totp_recovery(request_id: int, reason: str | None, actor: User, db: Session) -> dict:
    req = totp_recovery_repository.get_request_by_id(db, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Recovery request not found.")
    if req.status != "PENDING_APPROVAL":
        raise HTTPException(status_code=400, detail=f"Request is not pending approval (status: {req.status}).")

    user = get_admin_or_404(req.user_id, db)

    req.status = "REJECTED"
    req.resolved_by_user_id = actor.id
    req.resolved_at = datetime.now(timezone.utc)
    req.resolution_note = (reason or "Rejected by super admin.")[:500]
    db.commit()

    try:
        send_totp_recovery_rejected_notice(user.email)
    except Exception:
        logger.exception("Failed to send TOTP recovery rejection notice to user_id=%s", user.id)

    audit_auth_event(
        action="TOTP_RECOVERY_REJECTED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={"recovery_request_id": req.id, "reason": req.resolution_note},
    )
    return {"status": "success", "message": f"Recovery request for {user.email} has been rejected."}


# ── Voter verification ─────────────────────────────────────────

# Upload base paths – must match the paths used in registration_service.py
_PENDING_CITIZENSHIP_BASE = Path(__file__).resolve().parents[2] / "uploads" / "pending_citizenship"
_PENDING_FACES_BASE = Path(__file__).resolve().parents[2] / "uploads" / "pending_faces"
_FINAL_CITIZENSHIP_BASE = Path(__file__).resolve().parents[2] / "uploads" / "citizenship"
_FINAL_FACES_BASE = Path(__file__).resolve().parents[2] / "uploads" / "faces"


def _get_pending_reg_or_404(reg_id: int, db: Session) -> PendingVoterRegistration:
    reg = pending_registration_repository.get_by_id(db, reg_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Pending registration not found")
    return reg


def approve_voter(reg_id: int, actor: User, db: Session) -> dict:
    """Approve a pending voter registration → create the final User row."""
    reg = _get_pending_reg_or_404(reg_id, db)
    if reg.status != "PENDING_REVIEW":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve: registration status is '{reg.status}', expected 'PENDING_REVIEW'",
        )
    if not reg.citizenship_image_path:
        raise HTTPException(status_code=400, detail="Cannot approve: citizenship document not uploaded")
    if not reg.face_image_path:
        raise HTTPException(status_code=400, detail="Cannot approve: face photo not uploaded")

    now = datetime.now(timezone.utc)

    # ── Copy uploaded files from pending dirs to final dirs ──────
    final_doc_path = reg.citizenship_image_path
    final_face_path = reg.face_image_path
    try:
        src_doc_dir = _PENDING_CITIZENSHIP_BASE / str(reg.id)
        src_face_dir = _PENDING_FACES_BASE / str(reg.id)

        # We'll use the pending reg ID as a temporary placeholder;
        # after user creation we'll rename to the real user ID.
    except Exception:
        pass  # file ops are best-effort; paths stay as-is

    # ── Create the final User row ───────────────────────────────
    user = user_repository.create_user(
        db,
        email=reg.email,
        full_name=reg.full_name,
        phone_number=reg.phone_number,
        citizenship_no_raw=reg.citizenship_no_raw,
        citizenship_no_normalized=reg.citizenship_no_normalized,
        hashed_password=reg.hashed_password,
        role="voter",
        status="ACTIVE",
    )
    user.email_verified_at = reg.email_verified_at
    user.citizenship_image_path = reg.citizenship_image_path
    user.document_uploaded_at = reg.document_uploaded_at
    user.face_image_path = reg.face_image_path
    user.face_uploaded_at = reg.face_uploaded_at
    user.approved_at = now

    # Copy TOTP secret from pending registration so the voter can
    # authenticate with their existing authenticator app immediately.
    if reg.totp_secret:
        user.totp_secret = reg.totp_secret
        user.totp_enabled_at = now

    # ── Move uploaded files to user-id-based directories ────────
    try:
        pending_doc_dir = _PENDING_CITIZENSHIP_BASE / str(reg.id)
        if pending_doc_dir.is_dir():
            dest_doc_dir = _FINAL_CITIZENSHIP_BASE / str(user.id)
            dest_doc_dir.mkdir(parents=True, exist_ok=True)
            for f in pending_doc_dir.iterdir():
                shutil.copy2(str(f), str(dest_doc_dir / f.name))
            # Update user path to point to final location
            if reg.citizenship_image_path:
                fname = Path(reg.citizenship_image_path).name
                user.citizenship_image_path = f"uploads/citizenship/{user.id}/{fname}"

        pending_face_dir = _PENDING_FACES_BASE / str(reg.id)
        if pending_face_dir.is_dir():
            dest_face_dir = _FINAL_FACES_BASE / str(user.id)
            dest_face_dir.mkdir(parents=True, exist_ok=True)
            for f in pending_face_dir.iterdir():
                shutil.copy2(str(f), str(dest_face_dir / f.name))
            if reg.face_image_path:
                fname = Path(reg.face_image_path).name
                user.face_image_path = f"uploads/faces/{user.id}/{fname}"
    except Exception:
        logger.exception("Failed to copy pending uploads for reg_id=%s to user_id=%s", reg.id, user.id)
        # Non-fatal: paths may point to pending dirs but images are still on disk

    # ── Mark pending registration as approved ───────────────────
    reg.status = "APPROVED"
    reg.approved_at = now
    reg.approved_by_user_id = actor.id
    reg.converted_user_id = user.id
    reg.rejection_reason = None

    db.commit()

    audit_auth_event(
        action="ACCOUNT_APPROVED",
        actor_user_id=actor.id,
        target_user_id=user.id,
        metadata={
            "target_role": user.role,
            "new_status": user.status,
            "source_registration_id": reg.id,
        },
    )
    return {"success": True, "status": user.status, "user_id": user.id}


def reject_voter(reg_id: int, reason: str, actor: User, db: Session) -> dict:
    """Reject a pending voter registration."""
    reg = _get_pending_reg_or_404(reg_id, db)
    if reg.status not in ("PENDING_REVIEW", "PENDING_FACE", "PENDING_DOCUMENT"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject: registration status is '{reg.status}'",
        )
    reg.status = "REJECTED"
    reg.rejection_reason = reason
    db.commit()
    audit_auth_event(
        action="ACCOUNT_REJECTED",
        actor_user_id=actor.id,
        metadata={
            "source_registration_id": reg.id,
            "reason": reason,
        },
    )
    return {"success": True, "status": reg.status, "reason": reg.rejection_reason}


# ── Voter status management ─────────────────────────────────────

def suspend_voter(user_id: int, reason: str | None, actor: User, db: Session) -> dict:
    voter = get_voter_or_404(user_id, db)
    if voter.status == "SUSPENDED":
        return {"success": True, "status": voter.status}
    voter.status = "SUSPENDED"
    db.commit()
    audit_auth_event(
        action="ACCOUNT_SUSPENDED",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={"reason": reason, "target_role": voter.role},
    )
    return {"success": True, "status": voter.status}


def reactivate_voter(user_id: int, actor: User, db: Session) -> dict:
    voter = get_voter_or_404(user_id, db)
    if voter.status == "ACTIVE":
        return {"success": True, "status": voter.status}
    voter.status = "ACTIVE"
    db.commit()
    audit_auth_event(
        action="ACCOUNT_REACTIVATED",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={"target_role": voter.role},
    )
    return {"success": True, "status": voter.status}


def deactivate_voter(user_id: int, reason: str | None, actor: User, db: Session) -> dict:
    voter = get_voter_or_404(user_id, db)
    if voter.status == "SUSPENDED":
        return {"success": True, "status": voter.status}
    voter.status = "SUSPENDED"
    db.commit()
    audit_auth_event(
        action="ACCOUNT_DEACTIVATED",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={"reason": reason, "target_role": voter.role},
    )
    return {"success": True, "status": voter.status}


def delete_voter(
    user_id: int, reason: str | None, confirmation_text: str, actor: User, db: Session,
) -> dict:
    if confirmation_text.strip().upper() != "DELETE":
        raise HTTPException(status_code=400, detail='Confirmation text must be "DELETE"')

    voter = get_voter_or_404(user_id, db)
    vote_count = db.execute(
        select(func.count(Ballot.id)).where(Ballot.voter_id == voter.id)
    ).scalar() or 0

    if voter.status == "DISABLED":
        return {
            "success": True,
            "status": voter.status,
            "mode": "soft_delete",
            "detail": "Voter already deleted (disabled).",
        }

    voter.status = "DISABLED"
    voter.token_version += 1
    voter.totp_secret = None
    voter.totp_enabled_at = None
    if reason:
        voter.rejection_reason = reason
    db.commit()

    audit_auth_event(
        action="ACCOUNT_DELETED",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={
            "mode": "soft_delete",
            "has_vote_history": vote_count > 0,
            "vote_count": int(vote_count),
            "reason": reason,
            "target_role": voter.role,
        },
    )

    detail = "Voter deleted safely (account disabled to preserve audit history)."
    if vote_count > 0:
        detail = "Voter has vote history; account was disabled instead of hard-deleted."

    return {"success": True, "status": voter.status, "mode": "soft_delete", "detail": detail}


def update_voter(
    user_id: int,
    *,
    full_name: str | None,
    email: str | None,
    phone_number: str | None,
    actor: User,
    db: Session,
) -> tuple[User, int]:
    """Update voter fields. Returns (voter, vote_count) for the route to serialize."""
    voter = get_voter_or_404(user_id, db)

    if email and email != voter.email:
        existing = db.execute(
            select(User).where(User.email == email, User.id != voter.id)
        ).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")

    changed_fields = []
    if full_name is not None:
        voter.full_name = full_name
        changed_fields.append("full_name")
    if email is not None:
        voter.email = email
        changed_fields.append("email")
    if phone_number is not None:
        voter.phone_number = phone_number
        changed_fields.append("phone_number")

    db.commit()
    db.refresh(voter)

    audit_auth_event(
        action="ACCOUNT_UPDATED",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={"fields": changed_fields, "target_role": voter.role},
    )

    vote_count = db.execute(
        select(func.count(Ballot.id)).where(Ballot.voter_id == voter.id)
    ).scalar() or 0
    return voter, vote_count


def reset_voter_totp(user_id: int, reason: str | None, actor: User, db: Session) -> dict:
    voter = get_voter_or_404(user_id, db)
    if not voter.totp_secret:
        return {"success": True, "detail": "TOTP not enabled"}
    voter.totp_secret = None
    voter.totp_enabled_at = None
    db.commit()
    audit_auth_event(
        action="TOTP_RESET_BY_ADMIN",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={"reason": reason, "target_role": voter.role},
    )
    return {"success": True, "detail": "TOTP reset"}


# ── Voter email/password helpers ────────────────────────────────

def _hash_reset_code(raw_code: str) -> str:
    return hashlib.sha256(raw_code.encode()).hexdigest()


def _generate_reset_code() -> str:
    return "{:06d}".format(secrets.randbelow(1_000_000))


def issue_email_verification_for_voter(
    user: User, db: Session, request: Request | None,
) -> None:
    if not user.email:
        raise HTTPException(status_code=400, detail="User does not have an email address")
    now = datetime.now(timezone.utc)
    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == user.id,
            EmailVerification.purpose == "email_verification",
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > now,
        )
        .values(expires_at=now)
    )
    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=settings.EMAIL_VERIFICATION_TTL_MINUTES)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    verification = EmailVerification(
        user_id=user.id,
        email=user.email,
        purpose="email_verification",
        token_hash=token_hash,
        expires_at=expires_at,
        requested_ip=request.client.host if request and request.client else None,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None if request else None,
    )
    db.add(verification)
    db.commit()
    send_email_verification_with_fallback(user.email, raw_token, expires_at)


def resend_voter_verification(user_id: int, actor: User, db: Session, request: Request) -> dict:
    voter = get_voter_or_404(user_id, db)
    if voter.email_verified_at is not None:
        return {"success": True, "detail": "Email already verified"}
    try:
        issue_email_verification_for_voter(voter, db, request)
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=500, detail=exc.public_message) from exc
    return {"success": True, "detail": "Verification email sent"}


def reset_voter_password(user_id: int, actor: User, db: Session, request: Request) -> dict:
    voter = get_voter_or_404(user_id, db)
    if not voter.email:
        raise HTTPException(status_code=400, detail="User does not have an email address")

    now = datetime.now(timezone.utc)
    db.execute(
        update(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == voter.id,
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at > now,
        )
        .values(expires_at=now)
    )

    raw_code = _generate_reset_code()
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES)
    code_hash = _hash_reset_code(raw_code)

    reset_row = PasswordResetCode(
        user_id=voter.id,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=request.client.host if request.client else None,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.add(reset_row)
    db.commit()

    try:
        send_password_reset_code(voter.email, raw_code, expires_at)
    except EmailDeliveryError as exc:
        detail = exc.public_message
        if exc.fallback_token and settings.EMAIL_DEV_FALLBACK_EXPOSE_TOKEN:
            detail = f"{detail} | DEV RESET CODE: {exc.fallback_token}"
        raise HTTPException(status_code=500, detail=detail) from exc
    audit_auth_event(
        action="PASSWORD_RESET_REQUESTED_BY_ADMIN",
        actor_user_id=actor.id,
        target_user_id=voter.id,
        metadata={"email": voter.email},
    )
    return {"success": True, "detail": "Password reset email sent"}


# ── Voter listing / detail ──────────────────────────────────────

def _serialize_pending_voter(reg: PendingVoterRegistration) -> dict:
    return {
        "id": reg.id,
        "full_name": reg.full_name,
        "phone_number": reg.phone_number,
        "citizenship_no_raw": reg.citizenship_no_raw,
        "citizenship_no_normalized": reg.citizenship_no_normalized,
        "document_uploaded_at": reg.document_uploaded_at,
        "face_uploaded_at": reg.face_uploaded_at,
        "submitted_at": reg.submitted_at,
        "email": reg.email,
        "email_verified": bool(reg.email_verified_at),
        "status": reg.status,
    }


def _serialize_pending_voter_detail(reg: PendingVoterRegistration) -> dict:
    data = _serialize_pending_voter(reg)
    data.update({
        "approved_at": reg.approved_at,
        "rejection_reason": reg.rejection_reason,
        "email_verified_at": reg.email_verified_at,
        "face_uploaded_at": reg.face_uploaded_at,
        "document_uploaded_at": reg.document_uploaded_at,
        "created_at": reg.submitted_at,
        "status": reg.status,
        "account_status": reg.status,
        "citizenship_image_available": bool(reg.citizenship_image_path),
        "face_image_available": bool(reg.face_image_path),
        "voting_status": "Not Voted",
        "vote_count": 0,
    })
    return data


def _serialize_voter_detail(user: User) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "citizenship_no_raw": user.citizenship_no_raw,
        "citizenship_no_normalized": user.citizenship_no_normalized,
        "email": user.email,
        "email_verified": bool(user.email_verified_at),
        "email_verified_at": user.email_verified_at,
        "status": user.status,
        "account_status": user.status,
        "approved_at": user.approved_at,
        "rejection_reason": user.rejection_reason,
        "face_uploaded_at": user.face_uploaded_at,
        "document_uploaded_at": user.document_uploaded_at,
        "created_at": user.created_at,
        "citizenship_image_available": bool(user.citizenship_image_path),
        "face_image_available": bool(user.face_image_path),
    }


def _serialize_list_item(user: User, vote_count: int | None) -> dict:
    return {
        "id": user.id,
        "full_name": user.full_name,
        "citizenship_no_raw": user.citizenship_no_raw,
        "citizenship_no_normalized": user.citizenship_no_normalized,
        "email": user.email,
        "phone_number": user.phone_number,
        "status": user.status,
        "email_verified": bool(user.email_verified_at),
        "face_verified": bool(user.face_uploaded_at),
        "voting_status": "Voted" if vote_count and vote_count > 0 else "Not Voted",
        "account_status": user.status,
        "created_at": user.created_at,
    }


def list_pending_voters(db: Session) -> list[dict]:
    rows = pending_registration_repository.list_pending_review(db)
    return [_serialize_pending_voter(row) for row in rows]


def get_voter_detail(user_id: int, db: Session) -> dict:
    """Return detail for either a real voter (user) or a pending registration.

    The admin frontend uses voter IDs. For approved voters these are user IDs
    in the users table. For the pending queue they are pending_voter_registration IDs.
    We try users first, then fall back to pending registrations.
    """
    user = user_repository.get_user_by_id(db, user_id)
    if user and user.role == "voter":
        vote_count = db.execute(
            select(func.count(Ballot.id)).where(Ballot.voter_id == user.id)
        ).scalar() or 0
        detail = _serialize_voter_detail(user)
        detail.update({
            "voting_status": "Voted" if vote_count > 0 else "Not Voted",
            "vote_count": vote_count,
        })
        return detail

    # Try pending registration
    reg = pending_registration_repository.get_by_id(db, user_id)
    if reg:
        return _serialize_pending_voter_detail(reg)

    raise HTTPException(status_code=404, detail="Voter not found")


def list_voters(
    *,
    search: str | None,
    approval_status: str | None,
    email_status: str | None,
    face_status: str | None,
    voting_status: str | None,
    account_status: str | None,
    sort: str,
    order: str,
    page: int,
    page_size: int,
    db: Session,
) -> dict:
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    vote_count_subq = (
        select(func.count(Ballot.id))
        .where(Ballot.voter_id == User.id)
        .correlate(User)
        .scalar_subquery()
        .label("vote_count")
    )

    stmt = select(User, vote_count_subq).where(User.role == "voter")

    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            func.lower(User.full_name).like(term)
            | func.lower(User.email).like(term)
            | func.lower(User.citizenship_no_normalized).like(term)
        )

    if approval_status:
        status_map = {
            "Pending": "PENDING_REVIEW",
            "Approved": "ACTIVE",
            "Rejected": "REJECTED",
        }
        target = status_map.get(approval_status)
        if target:
            stmt = stmt.where(User.status == target)

    if email_status in {"verified", "unverified"}:
        stmt = stmt.where(
            (User.email_verified_at.isnot(None))
            if email_status == "verified"
            else (User.email_verified_at.is_(None))
        )

    if face_status in {"verified", "unverified"}:
        stmt = stmt.where(
            (User.face_uploaded_at.isnot(None))
            if face_status == "verified"
            else (User.face_uploaded_at.is_(None))
        )

    if voting_status in {"Voted", "Not Voted"}:
        stmt = (
            stmt.where(vote_count_subq > 0)
            if voting_status == "Voted"
            else stmt.where(vote_count_subq == 0)
        )

    if account_status:
        account_map = {
            "Active": "ACTIVE",
            "Suspended": "SUSPENDED",
            "Rejected": "REJECTED",
            "Pending": "PENDING_REVIEW",
            "Disabled": "DISABLED",
        }
        target_account = account_map.get(account_status, account_status)
        if target_account == "SUSPENDED":
            stmt = stmt.where(User.status.in_(("SUSPENDED", "DISABLED")))
        else:
            stmt = stmt.where(User.status == target_account)

    sort_lower = sort.lower()
    order_lower = order.lower()
    asc = order_lower == "asc"

    if sort_lower == "name":
        stmt = stmt.order_by(User.full_name.asc() if asc else User.full_name.desc())
    elif sort_lower == "status":
        stmt = stmt.order_by(User.status.asc() if asc else User.status.desc())
    elif sort_lower == "oldest":
        stmt = stmt.order_by(User.created_at.asc())
    else:
        stmt = stmt.order_by(User.created_at.desc())

    subq = stmt.subquery()
    total = db.execute(select(func.count()).select_from(subq)).scalar() or 0
    rows = db.execute(stmt.limit(page_size).offset((page - 1) * page_size)).all()

    items = [_serialize_list_item(row[0], row[1]) for row in rows]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def bulk_voter_actions(
    user_ids: list[int], action: str, reason: str | None, actor: User, db: Session,
) -> dict:
    user_ids = list({uid for uid in user_ids if isinstance(uid, int)})
    if not user_ids:
        raise HTTPException(status_code=400, detail="No user ids provided")

    allowed = {"approve", "reject", "suspend", "reactivate", "deactivate"}
    if action not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")
    if action == "reject" and not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    successes: list[int] = []
    failures: list[dict] = []

    for uid in user_ids:
        try:
            if action == "approve":
                # Try as pending registration first
                reg = pending_registration_repository.get_by_id(db, uid)
                if reg and reg.status == "PENDING_REVIEW":
                    result = approve_voter(uid, actor, db)
                    successes.append(uid)
                    continue
                # Fall back to existing user
                voter = get_voter_or_404(uid, db)
                if not voter.citizenship_image_path or not voter.face_image_path:
                    raise HTTPException(status_code=400, detail="Missing required uploads")
                voter.status = "ACTIVE"
                voter.approved_at = datetime.now(timezone.utc)
                voter.rejection_reason = None
                successes.append(uid)
            elif action == "reject":
                reg = pending_registration_repository.get_by_id(db, uid)
                if reg and reg.status in ("PENDING_REVIEW", "PENDING_FACE", "PENDING_DOCUMENT"):
                    result = reject_voter(uid, reason or "Rejected via bulk action", actor, db)
                    successes.append(uid)
                    continue
                voter = get_voter_or_404(uid, db)
                voter.status = "REJECTED"
                voter.rejection_reason = reason
                successes.append(uid)
            elif action in ("suspend", "deactivate"):
                voter = get_voter_or_404(uid, db)
                voter.status = "SUSPENDED"
                successes.append(uid)
            elif action == "reactivate":
                voter = get_voter_or_404(uid, db)
                voter.status = "ACTIVE"
                successes.append(uid)
        except HTTPException as exc:
            failures.append({"id": uid, "error": exc.detail})
        except Exception:
            failures.append({"id": uid, "error": "Unexpected error"})
    db.commit()

    audit_auth_event(
        action="BULK_VOTER_ACTION",
        actor_user_id=actor.id,
        metadata={"action": action, "success_count": len(successes), "failure_count": len(failures)},
    )
    return {"successes": successes, "failures": failures}
