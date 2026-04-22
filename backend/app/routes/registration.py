"""Pending voter registration routes.

Unauthenticated by design: the registrant has no ``users`` row yet, so
these endpoints rely on the registration ID + TOTP verification instead
of a JWT.
"""

import logging

from fastapi import APIRouter, Depends, File, UploadFile, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.utils.email import normalize_email
from app.utils.rate_limit import check_rate_limit
from app.services.registration_service import (
    submit_registration,
    totp_setup_registration,
    totp_verify_registration,
    get_registration_status,
    upload_document,
    upload_face,
)

router = APIRouter(prefix="/registration", tags=["voter-registration"])
logger = logging.getLogger(__name__)


# ── DTOs ────────────────────────────────────────────────────────

class SubmitRegistrationRequest(BaseModel):
    email: str
    full_name: str
    phone_number: str
    citizenship_number: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class TOTPVerifyRequest(BaseModel):
    code: str


# ── POST /registration/submit ──────────────────────────────────

@router.post("/submit")
def register_submit(
    payload: SubmitRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"reg_submit:ip:{client_ip}", limit=5, window_seconds=600)
    return submit_registration(
        email=payload.email,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        citizenship_number=payload.citizenship_number,
        password=payload.password,
        request=request,
        db=db,
    )


# ── POST /registration/{registration_id}/totp/setup ────────────

@router.post("/{registration_id}/totp/setup")
def register_totp_setup(
    registration_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"reg_totp_setup:ip:{client_ip}", limit=10, window_seconds=600)
    return totp_setup_registration(registration_id=registration_id, db=db)


# ── POST /registration/{registration_id}/totp/verify ───────────

@router.post("/{registration_id}/totp/verify")
def register_totp_verify(
    registration_id: int,
    payload: TOTPVerifyRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"reg_totp_verify:ip:{client_ip}", limit=10, window_seconds=600)
    return totp_verify_registration(
        registration_id=registration_id,
        code=payload.code,
        db=db,
    )


# ── GET /registration/{registration_id}/status ─────────────────

@router.get("/{registration_id}/status")
def register_status(
    registration_id: int,
    db: Session = Depends(get_db),
):
    return get_registration_status(registration_id=registration_id, db=db)


# ── POST /registration/{registration_id}/document ──────────────

@router.post("/{registration_id}/document")
async def register_upload_document(
    registration_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type not in ("image/jpeg", "image/png"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are accepted")

    data = await file.read()
    return await upload_document(
        registration_id=registration_id,
        file_data=data,
        content_type=file.content_type,
        db=db,
    )


# ── POST /registration/{registration_id}/face ──────────────────

@router.post("/{registration_id}/face")
async def register_upload_face(
    registration_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    data = await file.read()
    return await upload_face(
        registration_id=registration_id,
        file_data=data,
        content_type=file.content_type or "",
        db=db,
    )
