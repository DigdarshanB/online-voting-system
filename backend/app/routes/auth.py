import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.db.deps import get_db
from app.models.admin_invite import AdminInvite
from app.models.email_verification import EmailVerification
from app.models.password_reset_code import PasswordResetCode
from app.models.totp_recovery_request import TotpRecoveryRequest
from app.models.user import User
from app.core.security import hash_password, verify_password
from app.core.jwt import create_access_token, decode_activation_token, get_current_user
from app.utils.citizenship import normalize_citizenship_number
from app.utils.email import is_valid_email, normalize_email
from app.utils.rate_limit import check_named_rate_limit, check_rate_limit
from app.services.email_verification_delivery import send_email_verification
from app.services.password_reset_delivery import send_password_reset_code, send_password_changed_notification
from app.services.totp_recovery_delivery import (
    send_totp_recovery_code,
    send_totp_recovery_completed_notice,
    send_totp_recovery_pending_notice,
)
from app.services.auth_audit import audit_auth_event

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)

PASSWORD_POLICY_DETAIL = (
    "Password must be 8-128 characters and include at least one uppercase letter, "
    "one lowercase letter, and one number."
)
INVALID_CREDENTIALS_DETAIL = "Invalid credentials"
INVALID_OR_EXPIRED_RESET_CODE_DETAIL = "Invalid or expired reset code"
INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL = "Invalid or expired verification token"
PASSWORD_CHANGED_DETAIL = "Password changed successfully. Please log in again with your new password."
PASSWORD_RESET_DETAIL = "Password has been reset successfully. Please log in with your new password."

_PASSWORD_UPPER_RE = re.compile(r"[A-Z]")
_PASSWORD_LOWER_RE = re.compile(r"[a-z]")
_PASSWORD_DIGIT_RE = re.compile(r"\d")

EMAIL_VERIFICATION_PURPOSE = "VERIFY_EMAIL"
EMAIL_VERIFICATION_TTL_MINUTES = 15
GENERIC_EMAIL_VERIFICATION_RESPONSE = {
    "detail": "If eligible, a verification email has been sent."
}

PASSWORD_RESET_TTL_MINUTES = 15
PASSWORD_RESET_MAX_ATTEMPTS = 5
GENERIC_FORGOT_PASSWORD_RESPONSE = {
    "detail": "If an account with that email exists, a password reset code has been sent."
}

TOTP_RECOVERY_TTL_MINUTES = 15
TOTP_RECOVERY_MAX_ATTEMPTS = 5
GENERIC_TOTP_RECOVERY_RESPONSE = {
    "detail": "If the account is eligible, a TOTP recovery code has been sent."
}


def _detail_response(detail: str, **extra: object) -> dict[str, object]:
    payload: dict[str, object] = {"detail": detail}
    payload.update(extra)
    return payload


def _get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"

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


def _hash_verification_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _hash_reset_code(raw_code: str) -> str:
    return hashlib.sha256(raw_code.encode()).hexdigest()


def _hash_totp_recovery_code(raw_code: str) -> str:
    return hashlib.sha256(raw_code.encode()).hexdigest()


def _generate_reset_code() -> str:
    """Generate a 6-digit numeric reset code."""
    return "{:06d}".format(secrets.randbelow(1_000_000))


def _generate_totp_recovery_code() -> str:
    """Generate a 6-digit numeric TOTP recovery code."""
    return "{:06d}".format(secrets.randbelow(1_000_000))


def _validate_password_policy(password: str) -> None:
    """Enforce baseline password policy used by auth flows."""
    if len(password) < 8 or len(password) > 128:
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_UPPER_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_LOWER_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_DIGIT_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)


def _issue_email_verification_token(
    *,
    user: User,
    db: Session,
    request: Request,
) -> None:
    if not user.email:
        return

    now = datetime.now(timezone.utc)

    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == user.id,
            EmailVerification.purpose == EMAIL_VERIFICATION_PURPOSE,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > now,
        )
        .values(expires_at=now)
    )

    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=EMAIL_VERIFICATION_TTL_MINUTES)
    token_hash = _hash_verification_token(raw_token)

    verification = EmailVerification(
        user_id=user.id,
        email=user.email,
        purpose=EMAIL_VERIFICATION_PURPOSE,
        token_hash=token_hash,
        expires_at=expires_at,
        requested_ip=request.client.host if request.client else None,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.add(verification)
    db.commit()

    try:
        send_email_verification(user.email, raw_token, expires_at)
    except Exception:
        logger.exception("Failed to dispatch email verification for user_id=%s", user.id)

@router.post("/register")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    # --- Segment A0.1: block admin self-registration ---
    if payload.role and payload.role.lower() in ("admin", "super_admin"):
        raise HTTPException(
            status_code=403,
            detail="Public registration cannot create admin accounts",
        )
    # Force voter role regardless of any supplied value
    resolved_role = "voter"
    # -----------------------------------------------

    normalized = normalize_citizenship_number(payload.citizenship_number)
    _validate_password_policy(payload.password)

    existing = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Citizenship number already registered")

    existing_email = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        citizenship_no_raw=payload.citizenship_number,
        citizenship_no_normalized=normalized,
        hashed_password=hash_password(payload.password),
        role=resolved_role,
        status="PENDING_DOCUMENT",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _issue_email_verification_token(user=user, db=db, request=request)
    return {
        "id": user.id,
        "email": user.email,
        "citizenship_no": user.citizenship_no_normalized,
        "role": user.role,
    }


@router.post("/send-email-verification")
def send_email_verification_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = _get_client_ip(request)
    check_named_rate_limit("email_verification_send_user", f"email_verify_send:user:{current_user.id}")
    check_named_rate_limit("email_verification_send_ip", f"email_verify_send:ip:{client_ip}")
    if not current_user.email or current_user.email_verified_at is not None:
        return GENERIC_EMAIL_VERIFICATION_RESPONSE

    _issue_email_verification_token(user=current_user, db=db, request=request)
    return GENERIC_EMAIL_VERIFICATION_RESPONSE


@router.post("/resend-email-verification")
def resend_email_verification_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Same behavior as send endpoint; separated for explicit client UX flows.
    return send_email_verification_endpoint(request=request, db=db, current_user=current_user)


@router.post("/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = _get_client_ip(request)
    check_named_rate_limit("email_verification_check_user", f"email_verify_check:user:{current_user.id}")
    check_named_rate_limit("email_verification_check_ip", f"email_verify_check:ip:{client_ip}")

    if not current_user.email:
        raise HTTPException(status_code=400, detail="Email is not set for this account")

    if current_user.email_verified_at is not None:
        return _detail_response("Email already verified")

    now = datetime.now(timezone.utc)
    token_hash = _hash_verification_token(payload.token)

    verification = db.execute(
        select(EmailVerification)
        .where(
            EmailVerification.user_id == current_user.id,
            EmailVerification.purpose == EMAIL_VERIFICATION_PURPOSE,
            EmailVerification.token_hash == token_hash,
            EmailVerification.used_at.is_(None),
        )
        .order_by(EmailVerification.created_at.desc())
    ).scalar_one_or_none()

    if not verification:
        raise HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL)
    if verification.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL)
    if verification.email != current_user.email:
        raise HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL)

    verification.used_at = now
    current_user.email_verified_at = now

    db.execute(
        update(EmailVerification)
        .where(
            EmailVerification.user_id == current_user.id,
            EmailVerification.purpose == EMAIL_VERIFICATION_PURPOSE,
            EmailVerification.id != verification.id,
            EmailVerification.used_at.is_(None),
            EmailVerification.expires_at > now,
        )
        .values(expires_at=now)
    )

    db.commit()
    audit_auth_event(
        action="EMAIL_VERIFIED",
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
        request=request,
        metadata={"role": current_user.role},
    )
    return _detail_response("Email verified successfully")

def _resolve_invite(payload: AdminActivateRequest, db: Session) -> AdminInvite:
    """Resolve invite from token (preferred) or invite_code (backward compat)."""
    invite: AdminInvite | None = None

    if payload.token:
        invite_id = decode_activation_token(payload.token)
        invite = db.execute(
            select(AdminInvite).where(AdminInvite.id == invite_id)
        ).scalar_one_or_none()
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid activation token")
    elif payload.invite_code:
        code_hash = hashlib.sha256(payload.invite_code.encode()).hexdigest()
        invite = db.execute(
            select(AdminInvite).where(AdminInvite.code_hash == code_hash)
        ).scalar_one_or_none()
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid invite code")
    else:
        raise HTTPException(status_code=400, detail="Provide token or invite_code")

    # Lifecycle checks
    if invite.status == "REVOKED":
        raise HTTPException(status_code=400, detail="Invite has been revoked")
    if invite.status == "USED":
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.status == "EXPIRED" or invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite has expired")

    return invite


@router.get("/admin/activate/validate")
def validate_activation_token(
    token: str = Query(..., description="Signed activation token from invite link"),
    db: Session = Depends(get_db),
):
    """Validate an activation token and return invite info (no auth required)."""
    invite_id = decode_activation_token(token)
    invite = db.execute(
        select(AdminInvite).where(AdminInvite.id == invite_id)
    ).scalar_one_or_none()

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid activation token")
    if invite.status == "REVOKED":
        raise HTTPException(status_code=400, detail="Invite has been revoked")
    if invite.status == "USED":
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.status == "EXPIRED" or invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite has expired")

    return {
        "valid": True,
        "recipient_identifier": invite.recipient_identifier,
        "expires_at": invite.expires_at.isoformat(),
    }


@router.post("/admin/activate")
def admin_activate(payload: AdminActivateRequest, request: Request, db: Session = Depends(get_db)):
    """Activate an admin account using a signed token or raw invite code."""
    invite = _resolve_invite(payload, db)

    normalized = normalize_citizenship_number(payload.citizenship_number)
    _validate_password_policy(payload.password)

    existing = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Citizenship number already registered")

    existing_email = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    invite_recipient = (invite.recipient_identifier or "").strip().lower()
    if is_valid_email(invite_recipient) and invite_recipient != payload.email:
        raise HTTPException(status_code=400, detail="Email does not match invite")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        citizenship_no_raw=payload.citizenship_number,
        citizenship_no_normalized=normalized,
        hashed_password=hash_password(payload.password),
        role="admin",
        status="PENDING_MFA",
    )
    db.add(user)

    invite.used_at = datetime.now(timezone.utc)
    invite.status = "USED"
    db.commit()
    db.refresh(user)
    _issue_email_verification_token(user=user, db=db, request=request)
    audit_auth_event(
        action="ADMIN_ACTIVATION_COMPLETED",
        actor_user_id=user.id,
        target_user_id=user.id,
        request=request,
        metadata={"invite_id": invite.id, "status": user.status},
    )

    return {
        "id": user.id,
        "email": user.email,
        "citizenship_no": user.citizenship_no_normalized,
        "role": user.role,
        "status": user.status,
    }


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    try:
        normalized = normalize_citizenship_number(payload.citizenship_number)
    except (ValueError, HTTPException):
        audit_auth_event(
            action="LOGIN_FAILURE",
            outcome="FAILURE",
            request=request,
            metadata={"reason": "invalid_citizenship_format", "portal": "voter"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)
    client_ip = _get_client_ip(request)
    check_named_rate_limit("login", f"login:id:{normalized}")
    check_named_rate_limit("login", f"login:ip:{client_ip}")

    user = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        audit_auth_event(
            action="LOGIN_FAILURE",
            outcome="FAILURE",
            target_user_id=user.id if user else None,
            request=request,
            metadata={"reason": "invalid_credentials", "portal": "voter"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)

    # Voters may login in any verification state so they can check status / complete steps.
    # Admins still require ACTIVE (handled by /admin/login).
    _VOTER_BLOCKED_STATUSES = {"DISABLED"}
    if user.role == "voter" and user.status in _VOTER_BLOCKED_STATUSES:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if user.role != "voter" and user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")

    token = create_access_token(subject=str(user.id), role=user.role, token_version=user.token_version)
    audit_auth_event(
        action="LOGIN_SUCCESS",
        actor_user_id=user.id,
        target_user_id=user.id,
        request=request,
        metadata={"role": user.role, "portal": "voter"},
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/admin/login")
def admin_login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Admin-only login gate: rejects voters before issuing a token."""
    try:
        normalized = normalize_citizenship_number(payload.citizenship_number)
    except (ValueError, HTTPException):
        audit_auth_event(
            action="LOGIN_FAILURE",
            outcome="FAILURE",
            request=request,
            metadata={"reason": "invalid_citizenship_format", "portal": "admin"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)
    client_ip = _get_client_ip(request)
    check_named_rate_limit("login", f"admin_login:id:{normalized}")
    check_named_rate_limit("login", f"admin_login:ip:{client_ip}")

    user = db.execute(
        select(User).where(User.citizenship_no_normalized == normalized)
    ).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        audit_auth_event(
            action="LOGIN_FAILURE",
            outcome="FAILURE",
            target_user_id=user.id if user else None,
            request=request,
            metadata={"reason": "invalid_credentials", "portal": "admin"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)

    # --- Segment A3.1: role gate ---
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Access denied: admin accounts only")
    # --------------------------------

    # Allow PENDING_MFA so admin can reach TOTP-setup after activation;
    # block every other non-ACTIVE state.
    if user.status not in ("ACTIVE", "PENDING_MFA"):
        raise HTTPException(
            status_code=403,
            detail="Admin account pending MFA setup or approval. Please complete MFA enrolment first.",
        )

    token = create_access_token(subject=str(user.id), role=user.role, token_version=user.token_version)
    audit_auth_event(
        action="LOGIN_SUCCESS",
        actor_user_id=user.id,
        target_user_id=user.id,
        request=request,
        metadata={"role": user.role, "portal": "admin"},
    )
    return {"access_token": token, "token_type": "bearer"}


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
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Request a password reset code. Always returns a generic response."""
    client_ip = _get_client_ip(request)
    check_named_rate_limit("auth_request_ip", f"forgot_pw:ip:{client_ip}")
    check_named_rate_limit("auth_request_identifier", f"forgot_pw:email:{payload.email}")

    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    if not user or not user.email:
        audit_auth_event(
            action="PASSWORD_RESET_REQUESTED",
            outcome="NO_MATCH",
            request=request,
            metadata={"email": payload.email},
        )
        return GENERIC_FORGOT_PASSWORD_RESPONSE

    # Invalidate any active (unused + unexpired) codes for this user.
    now = datetime.now(timezone.utc)
    db.execute(
        update(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at > now,
        )
        .values(expires_at=now)
    )

    raw_code = _generate_reset_code()
    expires_at = now + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES)
    code_hash = _hash_reset_code(raw_code)

    reset_row = PasswordResetCode(
        user_id=user.id,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=client_ip,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.add(reset_row)
    db.commit()

    try:
        send_password_reset_code(user.email, raw_code, expires_at)
    except Exception:
        logger.exception("Failed to dispatch password reset code for user_id=%s", user.id)

    audit_auth_event(
        action="PASSWORD_RESET_REQUESTED",
        target_user_id=user.id,
        request=request,
        metadata={"email": user.email},
    )

    return GENERIC_FORGOT_PASSWORD_RESPONSE


# ── POST /auth/reset-password ──────────────────────────────────

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Verify reset code and set a new password. No auto-login."""
    client_ip = _get_client_ip(request)
    check_named_rate_limit("auth_code_verify_ip", f"reset_pw:ip:{client_ip}")
    check_named_rate_limit("auth_code_verify_identifier", f"reset_pw:email:{payload.email}")

    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    _validate_password_policy(payload.new_password)

    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    generic_fail = HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_RESET_CODE_DETAIL)

    if not user:
        raise generic_fail

    now = datetime.now(timezone.utc)
    code_hash = _hash_reset_code(payload.code)

    reset_row = db.execute(
        select(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.code_hash == code_hash,
            PasswordResetCode.used_at.is_(None),
        )
        .order_by(PasswordResetCode.created_at.desc())
    ).scalar_one_or_none()

    if not reset_row:
        raise generic_fail

    # Check max verification attempts on this code.
    if reset_row.attempt_count >= PASSWORD_RESET_MAX_ATTEMPTS:
        raise generic_fail

    reset_row.attempt_count += 1

    if reset_row.expires_at.replace(tzinfo=timezone.utc) < now:
        db.commit()
        raise generic_fail

    # Code is valid — apply the reset.
    reset_row.used_at = now
    user.hashed_password = hash_password(payload.new_password)
    user.token_version += 1  # Invalidate all existing sessions

    # Expire all other unused codes for this user.
    db.execute(
        update(PasswordResetCode)
        .where(
            PasswordResetCode.user_id == user.id,
            PasswordResetCode.id != reset_row.id,
            PasswordResetCode.used_at.is_(None),
            PasswordResetCode.expires_at > now,
        )
        .values(expires_at=now)
    )

    db.commit()

    try:
        send_password_changed_notification(user.email)
    except Exception:
        logger.exception("Failed to send password changed notification for user_id=%s", user.id)

    audit_auth_event(
        action="PASSWORD_RESET_COMPLETED",
        target_user_id=user.id,
        request=request,
        metadata={"email": user.email},
    )

    return _detail_response(PASSWORD_RESET_DETAIL)


# ── POST /auth/change-password ────────────────────────────────

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password for an authenticated user and invalidate existing sessions."""
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"change_pw:user:{current_user.id}", limit=10, window_seconds=900)
    check_rate_limit(f"change_pw:ip:{client_ip}", limit=20, window_seconds=900)

    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    _validate_password_policy(payload.new_password)

    if verify_password(payload.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from your current password",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.token_version += 1  # Force re-login on all sessions, including this one.
    db.commit()

    logger.info(
        "Password changed user_id=%s role=%s ip=%s user_agent=%s",
        current_user.id,
        current_user.role,
        client_ip,
        (request.headers.get("user-agent") or "")[:500],
    )
    audit_auth_event(
        action="PASSWORD_CHANGED",
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
        request=request,
        metadata={"role": current_user.role},
    )

    return {
        "detail": PASSWORD_CHANGED_DETAIL
    }


# ── POST /auth/totp-recovery/request ─────────────────────────

@router.post("/totp-recovery/request")
def request_totp_recovery(
    payload: TotpRecoveryRequestIn,
    request: Request,
    db: Session = Depends(get_db),
):
    """Start TOTP recovery by sending an email code. Always generic response."""
    client_ip = _get_client_ip(request)
    check_named_rate_limit("auth_request_ip", f"totp_recovery_req:ip:{client_ip}")
    check_named_rate_limit("auth_request_identifier", f"totp_recovery_req:email:{payload.email}")

    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not user.email or user.email_verified_at is None:
        return GENERIC_TOTP_RECOVERY_RESPONSE

    now = datetime.now(timezone.utc)
    db.execute(
        update(TotpRecoveryRequest)
        .where(
            TotpRecoveryRequest.user_id == user.id,
            TotpRecoveryRequest.status == "PENDING_CODE",
            TotpRecoveryRequest.used_at.is_(None),
            TotpRecoveryRequest.expires_at > now,
        )
        .values(status="EXPIRED", expires_at=now)
    )

    raw_code = _generate_totp_recovery_code()
    expires_at = now + timedelta(minutes=TOTP_RECOVERY_TTL_MINUTES)
    code_hash = _hash_totp_recovery_code(raw_code)

    row = TotpRecoveryRequest(
        user_id=user.id,
        email=user.email,
        role=user.role,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=client_ip,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
        status="PENDING_CODE",
    )
    db.add(row)
    db.commit()

    try:
        send_totp_recovery_code(user.email, raw_code, expires_at)
    except Exception:
        logger.exception("Failed to send TOTP recovery code for user_id=%s", user.id)

    logger.info(
        "TOTP recovery requested user_id=%s role=%s ip=%s",
        user.id,
        user.role,
        client_ip,
    )
    return GENERIC_TOTP_RECOVERY_RESPONSE


# ── POST /auth/totp-recovery/complete ────────────────────────

@router.post("/totp-recovery/complete")
def complete_totp_recovery(
    payload: TotpRecoveryCompleteRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Verify recovery code and reset/re-route TOTP recovery depending on role."""
    client_ip = _get_client_ip(request)
    check_named_rate_limit("auth_code_verify_ip", f"totp_recovery_complete:ip:{client_ip}")
    check_named_rate_limit("auth_code_verify_identifier", f"totp_recovery_complete:email:{payload.email}")

    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    generic_fail = HTTPException(status_code=400, detail="Invalid or expired recovery code")
    if not user:
        raise generic_fail

    now = datetime.now(timezone.utc)
    code_hash = _hash_totp_recovery_code(payload.code)

    row = db.execute(
        select(TotpRecoveryRequest)
        .where(
            TotpRecoveryRequest.user_id == user.id,
            TotpRecoveryRequest.code_hash == code_hash,
            TotpRecoveryRequest.status == "PENDING_CODE",
            TotpRecoveryRequest.used_at.is_(None),
        )
        .order_by(TotpRecoveryRequest.created_at.desc())
    ).scalar_one_or_none()

    if not row:
        raise generic_fail

    if row.attempt_count >= TOTP_RECOVERY_MAX_ATTEMPTS:
        raise generic_fail

    row.attempt_count += 1

    if row.expires_at.replace(tzinfo=timezone.utc) < now:
        row.status = "EXPIRED"
        db.commit()
        raise generic_fail

    row.used_at = now

    if user.role == "voter":
        user.totp_secret = None
        user.totp_enabled_at = None
        user.token_version += 1
        row.status = "COMPLETED"
        db.commit()

        try:
            send_totp_recovery_completed_notice(user.email)
        except Exception:
            logger.exception("Failed to send TOTP recovery completed notice for user_id=%s", user.id)

        logger.info(
            "TOTP recovery completed user_id=%s role=%s ip=%s",
            user.id,
            user.role,
            client_ip,
        )
        audit_auth_event(
            action="TOTP_RESET",
            target_user_id=user.id,
            request=request,
            metadata={"method": "email_recovery", "role": user.role},
        )
        return {
            "detail": "TOTP reset completed. Please log in and set up TOTP again.",
            "status": "COMPLETED",
        }

    row.status = "PENDING_APPROVAL"
    db.commit()

    try:
        send_totp_recovery_pending_notice(user.email)
    except Exception:
        logger.exception("Failed to send TOTP recovery pending notice for user_id=%s", user.id)

    logger.info(
        "TOTP recovery awaiting approval user_id=%s role=%s ip=%s",
        user.id,
        user.role,
        client_ip,
    )
    return {
        "detail": "Recovery request submitted. A super admin must approve TOTP reset.",
        "status": "PENDING_APPROVAL",
    }

