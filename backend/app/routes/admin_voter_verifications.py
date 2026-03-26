"""
Admin endpoints for reviewing and approving/rejecting voter accounts.

Routes:
  GET   /admin/voters/pending
  GET   /admin/voters/{user_id}
  GET   /admin/voters/{user_id}/document
  GET   /admin/voters/{user_id}/face
  POST  /admin/voters/{user_id}/approve
  POST  /admin/voters/{user_id}/reject
"""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.core.config import settings
from app.models.email_verification import EmailVerification
from app.models.password_reset_code import PasswordResetCode
from app.models.user import User
from app.models.vote import Vote
from app.services.auth_audit import audit_auth_event
from app.services.email_verification_delivery import send_email_verification_with_fallback
from app.services.password_reset_delivery import send_password_reset_code
from app.services.email_delivery import EmailDeliveryError

router = APIRouter(prefix="/admin/voters", tags=["admin-voter-verifications"])

_UPLOAD_BASE = Path(__file__).resolve().parents[2] / "uploads" / "citizenship"
_UPLOAD_BASE_FACES = Path(__file__).resolve().parents[2] / "uploads" / "faces"


# ── Helpers ─────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _get_voter_or_404(user_id: int, db: Session) -> User:
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "voter":
        raise HTTPException(status_code=400, detail="Target user is not a voter")
    return user


def _hash_reset_code(raw_code: str) -> str:
    return hashlib.sha256(raw_code.encode()).hexdigest()


def _generate_reset_code() -> str:
    return "{:06d}".format(secrets.randbelow(1_000_000))


def _issue_email_verification_token_for_admin(
    *,
    user: User,
    db: Session,
    request: Request | None,
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


def _serialize_pending_voter(user: User) -> dict:
    """Shape a voter record for the pending queue responses."""
    timestamps = [dt for dt in (user.document_uploaded_at, user.face_uploaded_at) if dt]
    submitted_at = max(timestamps) if timestamps else None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "citizenship_no_raw": user.citizenship_no_raw,
        "citizenship_no_normalized": user.citizenship_no_normalized,
        "document_uploaded_at": user.document_uploaded_at,
        "face_uploaded_at": user.face_uploaded_at,
        "submitted_at": submitted_at,
        "email": user.email,
        "email_verified": bool(user.email_verified_at),
        "status": user.status,
    }


def _serialize_voter_detail(user: User) -> dict:
    data = _serialize_pending_voter(user)
    data.update(
        {
            "approved_at": user.approved_at,
            "rejection_reason": user.rejection_reason,
            "email_verified_at": user.email_verified_at,
            "face_uploaded_at": user.face_uploaded_at,
            "document_uploaded_at": user.document_uploaded_at,
            "created_at": user.created_at,
            "status": user.status,
            "account_status": user.status,
            "citizenship_image_available": bool(user.citizenship_image_path),
            "face_image_available": bool(user.face_image_path),
        }
    )
    return data


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


# ── DTOs ────────────────────────────────────────────────────────

class PendingVoterItem(BaseModel):
    id: int
    full_name: Optional[str]
    phone_number: Optional[str]
    citizenship_no_raw: Optional[str]
    citizenship_no_normalized: Optional[str]
    document_uploaded_at: Optional[datetime]
    face_uploaded_at: Optional[datetime]
    submitted_at: Optional[datetime]
    email: Optional[str]
    email_verified: bool
    status: str

    class Config:
        from_attributes = True


class VoterDetail(PendingVoterItem):
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]
    email_verified_at: Optional[datetime]
    face_uploaded_at: Optional[datetime]
    document_uploaded_at: Optional[datetime]
    created_at: datetime
    status: str
    account_status: str
    citizenship_image_available: bool
    face_image_available: bool
    vote_count: int
    voting_status: str


class RejectRequest(BaseModel):
    reason: str


class UpdateVoterRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None


class SuspendRequest(BaseModel):
    reason: Optional[str] = None


class DeactivateRequest(BaseModel):
    reason: Optional[str] = None


class DeleteVoterRequest(BaseModel):
    reason: Optional[str] = None
    confirmation_text: str


class BulkActionRequest(BaseModel):
    user_ids: list[int]
    action: str
    reason: Optional[str] = None

    def validate_action(self) -> str:
        allowed = {"approve", "reject", "suspend", "reactivate", "deactivate"}
        if self.action not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported action: {self.action}")
        if self.action == "reject" and not self.reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        return self.action


class ResendVerificationRequest(BaseModel):
    pass


class ResetPasswordRequest(BaseModel):
    pass


class ResetTotpRequest(BaseModel):
    reason: Optional[str] = None


class VoterListItem(BaseModel):
    id: int
    full_name: Optional[str]
    citizenship_no_raw: Optional[str]
    citizenship_no_normalized: Optional[str]
    email: Optional[str]
    phone_number: Optional[str]
    status: str
    email_verified: bool
    face_verified: bool
    voting_status: str
    account_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VoterListResponse(BaseModel):
    items: list[VoterListItem]
    total: int
    page: int
    page_size: int


# ── GET /admin/voters/pending ───────────────────────────────────

@router.get("", response_model=VoterListResponse)
def list_voters(
    search: str | None = None,
    approval_status: str | None = None,
    email_status: str | None = None,
    face_status: str | None = None,
    voting_status: str | None = None,
    account_status: str | None = None,
    sort: str = "newest",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    vote_count_subq = (
        select(func.count(Vote.id)).where(Vote.voter_id == User.id).correlate(User).scalar_subquery().label("vote_count")
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
        stmt = stmt.where((User.email_verified_at.isnot(None)) if email_status == "verified" else (User.email_verified_at.is_(None)))

    if face_status in {"verified", "unverified"}:
        stmt = stmt.where((User.face_uploaded_at.isnot(None)) if face_status == "verified" else (User.face_uploaded_at.is_(None)))

    if voting_status in {"Voted", "Not Voted"}:
        stmt = stmt.where(vote_count_subq > 0) if voting_status == "Voted" else stmt.where(vote_count_subq == 0)

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
    else:  # newest / default
        stmt = stmt.order_by(User.created_at.desc())

    subq = stmt.subquery()
    total = db.execute(select(func.count()).select_from(subq)).scalar() or 0
    rows = db.execute(stmt.limit(page_size).offset((page - 1) * page_size)).all()

    items = [_serialize_list_item(row[0], row[1]) for row in rows]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

@router.get("/pending", response_model=list[PendingVoterItem])
def list_pending_voters(
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    rows = db.execute(
        select(User).where(
            User.role == "voter",
            User.status == "PENDING_REVIEW",
        )
    ).scalars().all()
    return [_serialize_pending_voter(row) for row in rows]


# ── GET /admin/voters/{user_id} ────────────────────────────────

@router.get("/{user_id}", response_model=VoterDetail)
def get_voter(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
    vote_count = db.execute(select(func.count(Vote.id)).where(Vote.voter_id == voter.id)).scalar() or 0
    detail = _serialize_voter_detail(voter)
    detail.update(
        {
            "voting_status": "Voted" if vote_count > 0 else "Not Voted",
            "vote_count": vote_count,
        }
    )
    return detail


# ── GET /admin/voters/{user_id}/document ────────────────────────

_MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


@router.get("/{user_id}/document")
def get_voter_document(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
    if not voter.citizenship_image_path:
        raise HTTPException(status_code=404, detail="No document uploaded")

    file_path = _UPLOAD_BASE / str(voter.id)
    # citizenship_image_path is like "uploads/citizenship/1/citizenship.jpg"
    filename = Path(voter.citizenship_image_path).name
    full_path = file_path / filename

    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    suffix = full_path.suffix.lower()
    media_type = _MEDIA_TYPES.get(suffix, "application/octet-stream")
    return FileResponse(full_path, media_type=media_type)


# ── GET /admin/voters/{user_id}/face ──────────────────────────

@router.get("/{user_id}/face")
def get_voter_face(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
    if not voter.face_image_path:
        raise HTTPException(status_code=404, detail="No face photo uploaded")

    file_path = _UPLOAD_BASE_FACES / str(voter.id)
    filename = Path(voter.face_image_path).name
    full_path = file_path / filename

    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="Face photo file not found on disk")

    suffix = full_path.suffix.lower()
    media_type = _MEDIA_TYPES.get(suffix, "application/octet-stream")
    return FileResponse(full_path, media_type=media_type)


# ── POST /admin/voters/{user_id}/approve ────────────────────────

@router.post("/{user_id}/approve")
def approve_voter(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)

    # Both citizenship document and face photo must exist before approval.
    if not voter.citizenship_image_path:
        raise HTTPException(status_code=400, detail="Cannot approve: citizenship document not uploaded")
    if not voter.face_image_path:
        raise HTTPException(status_code=400, detail="Cannot approve: face photo not uploaded")

    voter.status = "ACTIVE"
    voter.approved_at = datetime.now(timezone.utc)
    voter.rejection_reason = None
    db.commit()
    audit_auth_event(
        action="ACCOUNT_APPROVED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"target_role": voter.role, "new_status": voter.status},
    )
    return {"success": True, "status": voter.status}


# ── POST /admin/voters/{user_id}/reject ─────────────────────────

@router.post("/{user_id}/reject")
def reject_voter(
    user_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
    voter.status = "REJECTED"
    voter.rejection_reason = payload.reason
    db.commit()
    audit_auth_event(
        action="ACCOUNT_REJECTED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"target_role": voter.role, "reason": payload.reason},
    )
    return {"success": True, "status": voter.status, "reason": voter.rejection_reason}


# ── PATCH /admin/voters/{user_id} ──────────────────────────────


@router.patch("/{user_id}", response_model=VoterDetail)
def update_voter(
    user_id: int,
    payload: UpdateVoterRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)

    if payload.email and payload.email != voter.email:
        existing = db.execute(select(User).where(User.email == payload.email, User.id != voter.id)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")

    if payload.full_name is not None:
        voter.full_name = payload.full_name
    if payload.email is not None:
        voter.email = payload.email
    if payload.phone_number is not None:
        voter.phone_number = payload.phone_number

    db.commit()
    db.refresh(voter)

    audit_auth_event(
        action="ACCOUNT_UPDATED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={
            "fields": [field for field, value in payload.dict().items() if value is not None],
            "target_role": voter.role,
        },
    )

    vote_count = db.execute(select(func.count(Vote.id)).where(Vote.voter_id == voter.id)).scalar() or 0
    detail = _serialize_voter_detail(voter)
    detail.update({"voting_status": "Voted" if vote_count > 0 else "Not Voted", "vote_count": vote_count})
    return detail


# ── POST /admin/voters/{user_id}/suspend ──────────────────────


@router.post("/{user_id}/suspend")
def suspend_voter(
    user_id: int,
    payload: SuspendRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)

    if voter.status == "SUSPENDED":
        return {"success": True, "status": voter.status}

    voter.status = "SUSPENDED"
    db.commit()
    audit_auth_event(
        action="ACCOUNT_SUSPENDED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"reason": payload.reason, "target_role": voter.role},
    )
    return {"success": True, "status": voter.status}


# ── POST /admin/voters/{user_id}/reactivate ───────────────────


@router.post("/{user_id}/reactivate")
def reactivate_voter(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)

    if voter.status == "ACTIVE":
        return {"success": True, "status": voter.status}

    voter.status = "ACTIVE"
    db.commit()
    audit_auth_event(
        action="ACCOUNT_REACTIVATED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"target_role": voter.role},
    )
    return {"success": True, "status": voter.status}


# ── POST /admin/voters/{user_id}/deactivate ───────────────────


@router.post("/{user_id}/deactivate")
def deactivate_voter(
    user_id: int,
    payload: DeactivateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)

    if voter.status == "SUSPENDED":
        return {"success": True, "status": voter.status}

    voter.status = "SUSPENDED"
    db.commit()
    audit_auth_event(
        action="ACCOUNT_DEACTIVATED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"reason": payload.reason, "target_role": voter.role},
    )
    return {"success": True, "status": voter.status}


# ── POST /admin/voters/{user_id}/delete ───────────────────────


@router.post("/{user_id}/delete")
def delete_voter(
    user_id: int,
    payload: DeleteVoterRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """Safe voter delete: restricted to soft-delete to preserve vote/audit integrity."""
    if payload.confirmation_text.strip().upper() != "DELETE":
        raise HTTPException(status_code=400, detail='Confirmation text must be "DELETE"')

    voter = _get_voter_or_404(user_id, db)
    vote_count = db.execute(select(func.count(Vote.id)).where(Vote.voter_id == voter.id)).scalar() or 0

    if voter.status == "DISABLED":
        return {
            "success": True,
            "status": voter.status,
            "mode": "soft_delete",
            "detail": "Voter already deleted (disabled).",
        }

    # Use restricted soft-delete to avoid breaking relational integrity and election audit trail.
    voter.status = "DISABLED"
    voter.token_version += 1
    voter.totp_secret = None
    voter.totp_enabled_at = None
    if payload.reason:
        voter.rejection_reason = payload.reason
    db.commit()

    audit_auth_event(
        action="ACCOUNT_DELETED",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={
            "mode": "soft_delete",
            "has_vote_history": vote_count > 0,
            "vote_count": int(vote_count),
            "reason": payload.reason,
            "target_role": voter.role,
        },
    )

    detail = "Voter deleted safely (account disabled to preserve audit history)."
    if vote_count > 0:
        detail = "Voter has vote history; account was disabled instead of hard-deleted."

    return {
        "success": True,
        "status": voter.status,
        "mode": "soft_delete",
        "detail": detail,
    }


# ── POST /admin/voters/{user_id}/resend-verification ──────────


@router.post("/{user_id}/resend-verification")
def resend_verification(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
    if voter.email_verified_at is not None:
        return {"success": True, "detail": "Email already verified"}
    try:
        _issue_email_verification_token_for_admin(user=voter, db=db, request=request)
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=500, detail=exc.public_message) from exc
    return {"success": True, "detail": "Verification email sent"}


# ── POST /admin/voters/{user_id}/reset-password ───────────────


@router.post("/{user_id}/reset-password")
def reset_password_admin(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
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
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"email": voter.email},
    )
    return {"success": True, "detail": "Password reset email sent"}


# ── POST /admin/voters/{user_id}/reset-totp ───────────────────


@router.post("/{user_id}/reset-totp")
def reset_totp_admin(
    user_id: int,
    payload: ResetTotpRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter = _get_voter_or_404(user_id, db)
    if not voter.totp_secret:
        return {"success": True, "detail": "TOTP not enabled"}

    voter.totp_secret = None
    voter.totp_enabled_at = None
    db.commit()
    audit_auth_event(
        action="TOTP_RESET_BY_ADMIN",
        actor_user_id=_admin.id,
        target_user_id=voter.id,
        metadata={"reason": payload.reason, "target_role": voter.role},
    )
    return {"success": True, "detail": "TOTP reset"}


# ── POST /admin/voters/bulk ───────────────────────────────────


@router.post("/bulk/actions")
def bulk_actions(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    action = payload.validate_action()
    user_ids = list({uid for uid in payload.user_ids if isinstance(uid, int)})
    if not user_ids:
        raise HTTPException(status_code=400, detail="No user ids provided")

    successes: list[int] = []
    failures: list[dict] = []

    for uid in user_ids:
        try:
            voter = _get_voter_or_404(uid, db)
            if action == "approve":
                if not voter.citizenship_image_path or not voter.face_image_path:
                    raise HTTPException(status_code=400, detail="Missing required uploads")
                voter.status = "ACTIVE"
                voter.approved_at = datetime.now(timezone.utc)
                voter.rejection_reason = None
            elif action == "reject":
                voter.status = "REJECTED"
                voter.rejection_reason = payload.reason
            elif action == "suspend" or action == "deactivate":
                voter.status = "SUSPENDED"
            elif action == "reactivate":
                voter.status = "ACTIVE"
            successes.append(uid)
        except HTTPException as exc:
            failures.append({"id": uid, "error": exc.detail})
        except Exception:
            failures.append({"id": uid, "error": "Unexpected error"})
    db.commit()

    audit_auth_event(
        action="BULK_VOTER_ACTION",
        actor_user_id=_admin.id,
        metadata={"action": action, "success_count": len(successes), "failure_count": len(failures)},
    )

    return {"successes": successes, "failures": failures}
