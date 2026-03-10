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

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.core.jwt import get_current_user
from app.models.user import User

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


# ── DTOs ────────────────────────────────────────────────────────

class PendingVoterItem(BaseModel):
    id: int
    full_name: Optional[str]
    phone_number: Optional[str]
    citizenship_no_raw: Optional[str]
    citizenship_no_normalized: Optional[str]
    document_uploaded_at: Optional[datetime]
    face_uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True


class VoterDetail(PendingVoterItem):
    status: str
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]


class RejectRequest(BaseModel):
    reason: str


# ── GET /admin/voters/pending ───────────────────────────────────

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
    return rows


# ── GET /admin/voters/{user_id} ────────────────────────────────

@router.get("/{user_id}", response_model=VoterDetail)
def get_voter(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    return _get_voter_or_404(user_id, db)


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
    return {"success": True, "status": voter.status, "reason": voter.rejection_reason}
