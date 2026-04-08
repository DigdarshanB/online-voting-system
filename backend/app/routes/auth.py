import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.user import User
from app.core.jwt import get_current_user
from app.utils.email import normalize_email
from app.utils.rate_limit import check_named_rate_limit, check_rate_limit
from app.services.auth_service import (
    GENERIC_EMAIL_VERIFICATION_RESPONSE,
    get_client_ip,
    issue_email_verification_token,
    register_voter,
    verify_email_token,
    validate_activation_token,
    resolve_invite,
    activate_admin,
    login_voter,
    login_admin,
    forgot_password,
    reset_password,
    change_password,
    request_totp_recovery,
    complete_totp_recovery,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

class RegisterRequest(BaseModel):
    email: str
    full_name: str
    phone_number: str
    citizenship_number: str
    password: str
    role: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)

class LoginRequest(BaseModel):
    citizenship_number: str
    password: str


class AdminActivateRequest(BaseModel):
    invite_code: Optional[str] = None
    token: Optional[str] = None
    email: str
    full_name: str
    phone_number: str
    citizenship_number: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str


class TotpRecoveryRequestIn(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class TotpRecoveryCompleteRequest(BaseModel):
    email: str
    code: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/register")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    return register_voter(
        email=payload.email,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        citizenship_number=payload.citizenship_number,
        password=payload.password,
        role=payload.role,
        request=request,
        db=db,
    )


@router.post("/send-email-verification")
def send_email_verification_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = get_client_ip(request)
    check_named_rate_limit("email_verification_send_user", f"email_verify_send:user:{current_user.id}")
    check_named_rate_limit("email_verification_send_ip", f"email_verify_send:ip:{client_ip}")
    if not current_user.email or current_user.email_verified_at is not None:
        return GENERIC_EMAIL_VERIFICATION_RESPONSE

    issue_email_verification_token(user=current_user, db=db, request=request)
    return GENERIC_EMAIL_VERIFICATION_RESPONSE


@router.post("/resend-email-verification")
def resend_email_verification_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return send_email_verification_endpoint(request=request, db=db, current_user=current_user)


@router.post("/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = get_client_ip(request)
    check_named_rate_limit("email_verification_check_user", f"email_verify_check:user:{current_user.id}")
    check_named_rate_limit("email_verification_check_ip", f"email_verify_check:ip:{client_ip}")
    return verify_email_token(token=payload.token, current_user=current_user, db=db, request=request)


@router.get("/admin/activate/validate")
def validate_activation_token_endpoint(
    token: str = Query(..., description="Signed activation token from invite link"),
    db: Session = Depends(get_db),
):
    return validate_activation_token(token, db)


@router.post("/admin/activate")
def admin_activate(payload: AdminActivateRequest, request: Request, db: Session = Depends(get_db)):
    invite = resolve_invite(payload.token, payload.invite_code, db)
    return activate_admin(
        invite=invite,
        email=payload.email,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        citizenship_number=payload.citizenship_number,
        password=payload.password,
        request=request,
        db=db,
    )


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_named_rate_limit("login", f"login:id:{payload.citizenship_number}")
    check_named_rate_limit("login", f"login:ip:{client_ip}")
    return login_voter(
        citizenship_number=payload.citizenship_number,
        password=payload.password,
        request=request,
        db=db,
    )


@router.post("/admin/login")
def admin_login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_named_rate_limit("login", f"admin_login:id:{payload.citizenship_number}")
    check_named_rate_limit("login", f"admin_login:ip:{client_ip}")
    return login_admin(
        citizenship_number=payload.citizenship_number,
        password=payload.password,
        request=request,
        db=db,
    )


# ── GET /auth/me ────────────────────────────────────────────────

class MeResponse(BaseModel):
    id: int
    email: str | None = None
    email_verified: bool = False
    role: str
    status: str
    totp_enabled: bool
    rejection_reason: Optional[str] = None
    face_uploaded: bool = False


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(get_current_user)):
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        email_verified=current_user.email_verified_at is not None,
        role=current_user.role,
        status=current_user.status,
        totp_enabled=current_user.totp_enabled_at is not None,
        rejection_reason=current_user.rejection_reason,
        face_uploaded=current_user.face_uploaded_at is not None,
    )


# ── POST /auth/forgot-password ─────────────────────────────────

@router.post("/forgot-password")
def forgot_password_endpoint(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_named_rate_limit("auth_request_ip", f"forgot_pw:ip:{client_ip}")
    check_named_rate_limit("auth_request_identifier", f"forgot_pw:email:{payload.email}")
    return forgot_password(email=payload.email, request=request, db=db)


# ── POST /auth/reset-password ──────────────────────────────────

@router.post("/reset-password")
def reset_password_endpoint(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    check_named_rate_limit("auth_code_verify_ip", f"reset_pw:ip:{client_ip}")
    check_named_rate_limit("auth_code_verify_identifier", f"reset_pw:email:{payload.email}")
    return reset_password(
        email=payload.email,
        code=payload.code,
        new_password=payload.new_password,
        confirm_password=payload.confirm_password,
        request=request,
        db=db,
    )


# ── POST /auth/change-password ────────────────────────────────

@router.post("/change-password")
def change_password_endpoint(
    payload: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = get_client_ip(request)
    check_rate_limit(f"change_pw:user:{current_user.id}", limit=10, window_seconds=900)
    check_rate_limit(f"change_pw:ip:{client_ip}", limit=20, window_seconds=900)
    return change_password(
        current_password=payload.current_password,
        new_password=payload.new_password,
        confirm_new_password=payload.confirm_new_password,
        current_user=current_user,
        request=request,
        db=db,
    )


# ── POST /auth/totp-recovery/request ─────────────────────────

@router.post("/totp-recovery/request")
def request_totp_recovery_endpoint(
    payload: TotpRecoveryRequestIn,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = get_client_ip(request)
    check_named_rate_limit("auth_request_ip", f"totp_recovery_req:ip:{client_ip}")
    check_named_rate_limit("auth_request_identifier", f"totp_recovery_req:email:{payload.email}")
    return request_totp_recovery(email=payload.email, request=request, db=db)


# ── POST /auth/totp-recovery/complete ────────────────────────

@router.post("/totp-recovery/complete")
def complete_totp_recovery_endpoint(
    payload: TotpRecoveryCompleteRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = get_client_ip(request)
    check_named_rate_limit("auth_code_verify_ip", f"totp_recovery_complete:ip:{client_ip}")
    check_named_rate_limit("auth_code_verify_identifier", f"totp_recovery_complete:email:{payload.email}")
    return complete_totp_recovery(email=payload.email, code=payload.code, request=request, db=db)


