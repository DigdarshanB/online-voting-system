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

from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User
from app.repositories import pending_registration_repository
from app.services.verification_service import (
    approve_voter,
    reject_voter,
    suspend_voter,
    reactivate_voter,
    deactivate_voter,
    delete_voter,
    update_voter,
    reset_voter_totp,
    resend_voter_verification,
    reset_voter_password,
    list_voters,
    list_pending_voters,
    get_voter_detail,
    get_voter_or_404,
    bulk_voter_actions,
    _serialize_voter_detail,
)

router = APIRouter(prefix="/admin/voters", tags=["admin-voter-verifications"])

_UPLOAD_BASE = Path(__file__).resolve().parents[2] / "uploads" / "citizenship"
_UPLOAD_BASE_FACES = Path(__file__).resolve().parents[2] / "uploads" / "faces"
_UPLOAD_BASE_PENDING_DOC = Path(__file__).resolve().parents[2] / "uploads" / "pending_citizenship"
_UPLOAD_BASE_PENDING_FACES = Path(__file__).resolve().parents[2] / "uploads" / "pending_faces"


# ── Helpers ─────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


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
def list_voters_route(
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
    return list_voters(
        search=search, approval_status=approval_status,
        email_status=email_status, face_status=face_status,
        voting_status=voting_status, account_status=account_status,
        sort=sort, order=order, page=page, page_size=page_size, db=db,
    )

@router.get("/pending", response_model=list[PendingVoterItem])
def list_pending_voters_route(
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return list_pending_voters(db)


# ── GET /admin/voters/{user_id} ────────────────────────────────

@router.get("/{user_id}", response_model=VoterDetail)
def get_voter(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return get_voter_detail(user_id, db)


# ── GET /admin/voters/{user_id}/document ────────────────────────

_MEDIA_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


@router.get("/{user_id}/document")
def get_voter_document(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    # Try real voter first, then pending registration
    from app.repositories import user_repository
    user = user_repository.get_user_by_id(db, user_id)
    if user and user.role == "voter":
        if not user.citizenship_image_path:
            raise HTTPException(status_code=404, detail="No document uploaded")
        file_path = _UPLOAD_BASE / str(user.id)
        filename = Path(user.citizenship_image_path).name
        full_path = file_path / filename
        if not full_path.is_file():
            raise HTTPException(status_code=404, detail="Document file not found on disk")
        suffix = full_path.suffix.lower()
        media_type = _MEDIA_TYPES.get(suffix, "application/octet-stream")
        return FileResponse(full_path, media_type=media_type)

    reg = pending_registration_repository.get_by_id(db, user_id)
    if reg:
        if not reg.citizenship_image_path:
            raise HTTPException(status_code=404, detail="No document uploaded")
        file_path = _UPLOAD_BASE_PENDING_DOC / str(reg.id)
        filename = Path(reg.citizenship_image_path).name
        full_path = file_path / filename
        if not full_path.is_file():
            raise HTTPException(status_code=404, detail="Document file not found on disk")
        suffix = full_path.suffix.lower()
        media_type = _MEDIA_TYPES.get(suffix, "application/octet-stream")
        return FileResponse(full_path, media_type=media_type)

    raise HTTPException(status_code=404, detail="Voter not found")


# ── GET /admin/voters/{user_id}/face ──────────────────────────

@router.get("/{user_id}/face")
def get_voter_face(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    from app.repositories import user_repository
    user = user_repository.get_user_by_id(db, user_id)
    if user and user.role == "voter":
        if not user.face_image_path:
            raise HTTPException(status_code=404, detail="No face photo uploaded")
        file_path = _UPLOAD_BASE_FACES / str(user.id)
        filename = Path(user.face_image_path).name
        full_path = file_path / filename
        if not full_path.is_file():
            raise HTTPException(status_code=404, detail="Face photo file not found on disk")
        suffix = full_path.suffix.lower()
        media_type = _MEDIA_TYPES.get(suffix, "application/octet-stream")
        return FileResponse(full_path, media_type=media_type)

    reg = pending_registration_repository.get_by_id(db, user_id)
    if reg:
        if not reg.face_image_path:
            raise HTTPException(status_code=404, detail="No face photo uploaded")
        file_path = _UPLOAD_BASE_PENDING_FACES / str(reg.id)
        filename = Path(reg.face_image_path).name
        full_path = file_path / filename
        if not full_path.is_file():
            raise HTTPException(status_code=404, detail="Face photo file not found on disk")
        suffix = full_path.suffix.lower()
        media_type = _MEDIA_TYPES.get(suffix, "application/octet-stream")
        return FileResponse(full_path, media_type=media_type)

    raise HTTPException(status_code=404, detail="Voter not found")


# ── POST /admin/voters/{user_id}/approve ────────────────────────

@router.post("/{user_id}/approve")
def approve_voter_route(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return approve_voter(user_id, _admin, db)


# ── POST /admin/voters/{user_id}/reject ─────────────────────────

@router.post("/{user_id}/reject")
def reject_voter_route(
    user_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return reject_voter(user_id, payload.reason, _admin, db)


# ── PATCH /admin/voters/{user_id} ──────────────────────────────


@router.patch("/{user_id}", response_model=VoterDetail)
def update_voter_route(
    user_id: int,
    payload: UpdateVoterRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    voter, vote_count = update_voter(
        user_id,
        full_name=payload.full_name,
        email=payload.email,
        phone_number=payload.phone_number,
        actor=_admin,
        db=db,
    )
    detail = _serialize_voter_detail(voter)
    detail.update({"voting_status": "Voted" if vote_count > 0 else "Not Voted", "vote_count": vote_count})
    return detail


# ── POST /admin/voters/{user_id}/suspend ──────────────────────


@router.post("/{user_id}/suspend")
def suspend_voter_route(
    user_id: int,
    payload: SuspendRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return suspend_voter(user_id, payload.reason, _admin, db)


# ── POST /admin/voters/{user_id}/reactivate ───────────────────


@router.post("/{user_id}/reactivate")
def reactivate_voter_route(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return reactivate_voter(user_id, _admin, db)


# ── POST /admin/voters/{user_id}/deactivate ───────────────────


@router.post("/{user_id}/deactivate")
def deactivate_voter_route(
    user_id: int,
    payload: DeactivateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return deactivate_voter(user_id, payload.reason, _admin, db)


# ── POST /admin/voters/{user_id}/delete ───────────────────────


@router.post("/{user_id}/delete")
def delete_voter_route(
    user_id: int,
    payload: DeleteVoterRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return delete_voter(user_id, payload.reason, payload.confirmation_text, _admin, db)


# ── POST /admin/voters/{user_id}/resend-verification ──────────


@router.post("/{user_id}/resend-verification")
def resend_verification(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return resend_voter_verification(user_id, _admin, db, request)


# ── POST /admin/voters/{user_id}/reset-password ───────────────


@router.post("/{user_id}/reset-password")
def reset_password_admin(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return reset_voter_password(user_id, _admin, db, request)


# ── POST /admin/voters/{user_id}/reset-totp ───────────────────


@router.post("/{user_id}/reset-totp")
def reset_totp_admin(
    user_id: int,
    payload: ResetTotpRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return reset_voter_totp(user_id, payload.reason, _admin, db)


# ── POST /admin/voters/bulk ───────────────────────────────────


@router.post("/bulk/actions")
def bulk_actions(
    payload: BulkActionRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    payload.validate_action()
    return bulk_voter_actions(payload.user_ids, payload.action, payload.reason, _admin, db)
