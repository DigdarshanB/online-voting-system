"""Authentication service – business logic for register, login, password, TOTP recovery."""

import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.core.config import settings
from app.core.jwt import create_access_token, decode_activation_token
from app.core.security import hash_password, verify_password
from app.models.admin_invite import AdminInvite
from app.models.user import User
from app.repositories import (
    admin_invite_repository,
    email_verification_repository,
    password_reset_repository,
    totp_recovery_repository,
    user_repository,
)
from app.services.auth_audit import audit_auth_event
from app.services.email_delivery import EmailDeliveryError
from app.services.email_verification_delivery import send_email_verification_with_fallback
from app.services.password_reset_delivery import send_password_reset_code, send_password_changed_notification
from app.services.totp_recovery_delivery import (
    send_totp_recovery_code,
    send_totp_recovery_completed_notice,
    send_totp_recovery_pending_notice,
)
from app.utils.citizenship import normalize_citizenship_number
from app.utils.email import is_valid_email, normalize_email

logger = logging.getLogger(__name__)

# ── Constants ───────────────────────────────────────────────────

PASSWORD_POLICY_DETAIL = (
    "Password must be 8-128 characters and include at least one uppercase letter, "
    "one lowercase letter, and one number."
)
INVALID_CREDENTIALS_DETAIL = "Invalid credentials"
INVALID_OR_EXPIRED_RESET_CODE_DETAIL = "Invalid or expired reset code"
INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL = "Invalid or expired verification token"
PASSWORD_CHANGED_DETAIL = "Password changed successfully. Please log in again with your new password."
PASSWORD_RESET_DETAIL = "Password has been reset successfully. Please log in with your new password."

EMAIL_VERIFICATION_PURPOSE = "VERIFY_EMAIL"
EMAIL_VERIFICATION_TTL_MINUTES = 15
GENERIC_EMAIL_VERIFICATION_RESPONSE = {"detail": "If eligible, a verification email has been sent."}

PASSWORD_RESET_TTL_MINUTES = 15
PASSWORD_RESET_MAX_ATTEMPTS = 5
GENERIC_FORGOT_PASSWORD_RESPONSE = {"detail": "If an account with that email exists, a password reset code has been sent."}

TOTP_RECOVERY_TTL_MINUTES = 15
TOTP_RECOVERY_MAX_ATTEMPTS = 5
GENERIC_TOTP_RECOVERY_RESPONSE = {"detail": "If the account is eligible, a TOTP recovery code has been sent."}

_PASSWORD_UPPER_RE = re.compile(r"[A-Z]")
_PASSWORD_LOWER_RE = re.compile(r"[a-z]")
_PASSWORD_DIGIT_RE = re.compile(r"\d")


# ── Helpers ─────────────────────────────────────────────────────

def _detail_response(detail: str, **extra: object) -> dict[str, object]:
    payload: dict[str, object] = {"detail": detail}
    payload.update(extra)
    return payload


def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def validate_password_policy(password: str) -> None:
    if len(password) < 8 or len(password) > 128:
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_UPPER_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_LOWER_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)
    if not _PASSWORD_DIGIT_RE.search(password):
        raise HTTPException(status_code=400, detail=PASSWORD_POLICY_DETAIL)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _generate_numeric_code() -> str:
    return "{:06d}".format(secrets.randbelow(1_000_000))


# ── Email verification token issuance ───────────────────────────

def issue_email_verification_token(
    *,
    user: User,
    db: Session,
    request: Request,
) -> None:
    if not user.email:
        return

    now = datetime.now(timezone.utc)
    email_verification_repository.invalidate_active_tokens(
        db, user.id, EMAIL_VERIFICATION_PURPOSE, now
    )

    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=EMAIL_VERIFICATION_TTL_MINUTES)
    token_hash = _hash_token(raw_token)

    email_verification_repository.create_verification(
        db,
        user_id=user.id,
        email=user.email,
        purpose=EMAIL_VERIFICATION_PURPOSE,
        token_hash=token_hash,
        expires_at=expires_at,
        requested_ip=request.client.host if request.client else None,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.commit()

    try:
        send_email_verification_with_fallback(user.email, raw_token, expires_at)
    except EmailDeliveryError as exc:
        detail = exc.public_message
        if exc.fallback_token and settings.EMAIL_DEV_FALLBACK_EXPOSE_TOKEN:
            detail = f"{detail} | DEV TOKEN: {exc.fallback_token}"
        raise HTTPException(status_code=500, detail=detail) from exc


# ── Register ────────────────────────────────────────────────────

def register_voter(
    *,
    email: str,
    full_name: str,
    phone_number: str,
    citizenship_number: str,
    password: str,
    role: str | None,
    request: Request,
    db: Session,
) -> dict:
    """Delegate voter registration to the pending-registration service.

    This function no longer creates a ``users`` row. It creates a
    ``pending_voter_registrations`` row instead. The real user is only
    created when admin approval completes the verification pipeline.
    """
    if role and role.lower() in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Public registration cannot create admin accounts")

    from app.services.registration_service import submit_registration
    return submit_registration(
        email=email,
        full_name=full_name,
        phone_number=phone_number,
        citizenship_number=citizenship_number,
        password=password,
        request=request,
        db=db,
    )


# ── Email verification ──────────────────────────────────────────

def verify_email_token(
    *,
    token: str,
    current_user: User,
    db: Session,
    request: Request,
) -> dict:
    if not current_user.email:
        raise HTTPException(status_code=400, detail="Email is not set for this account")
    if current_user.email_verified_at is not None:
        return _detail_response("Email already verified")

    now = datetime.now(timezone.utc)
    token_hash = _hash_token(token)

    verification = email_verification_repository.get_verification_by_token_hash(
        db, user_id=current_user.id, purpose=EMAIL_VERIFICATION_PURPOSE, token_hash=token_hash
    )
    if not verification:
        raise HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL)
    if verification.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL)
    if verification.email != current_user.email:
        raise HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_VERIFICATION_TOKEN_DETAIL)

    verification.used_at = now
    current_user.email_verified_at = now

    email_verification_repository.invalidate_other_tokens(
        db, user_id=current_user.id, purpose=EMAIL_VERIFICATION_PURPOSE,
        exclude_id=verification.id, now=now,
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


# ── Invite resolution & admin activation ────────────────────────

def resolve_invite(token: str | None, invite_code: str | None, db: Session) -> AdminInvite:
    invite: AdminInvite | None = None

    if token:
        invite_id = decode_activation_token(token)
        invite = admin_invite_repository.get_invite_by_id(db, invite_id)
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid activation token")
    elif invite_code:
        code_hash = _hash_token(invite_code)
        invite = admin_invite_repository.get_invite_by_code_hash(db, code_hash)
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid invite code")
    else:
        raise HTTPException(status_code=400, detail="Provide token or invite_code")

    if invite.status == "REVOKED":
        raise HTTPException(status_code=400, detail="Invite has been revoked")
    if invite.status == "USED":
        raise HTTPException(status_code=400, detail="Invite already used")
    if invite.status == "EXPIRED" or invite.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invite has expired")

    return invite


def validate_activation_token(token: str, db: Session) -> dict:
    invite_id = decode_activation_token(token)
    invite = admin_invite_repository.get_invite_by_id(db, invite_id)

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


def activate_admin(
    *,
    invite: AdminInvite,
    email: str,
    full_name: str,
    phone_number: str,
    citizenship_number: str,
    password: str,
    request: Request,
    db: Session,
) -> dict:
    normalized = normalize_citizenship_number(citizenship_number)
    validate_password_policy(password)

    if user_repository.get_user_by_citizenship_normalized(db, normalized):
        raise HTTPException(status_code=400, detail="Citizenship number already registered")
    if user_repository.get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered")

    invite_recipient = (invite.recipient_identifier or "").strip().lower()
    if is_valid_email(invite_recipient) and invite_recipient != email:
        raise HTTPException(status_code=400, detail="Email does not match invite")

    user = User(
        email=email,
        full_name=full_name,
        phone_number=phone_number,
        citizenship_no_raw=citizenship_number,
        citizenship_no_normalized=normalized,
        hashed_password=hash_password(password),
        role="admin",
        status="PENDING_MFA",
    )
    db.add(user)

    invite.used_at = datetime.now(timezone.utc)
    invite.status = "USED"
    db.commit()
    db.refresh(user)

    issue_email_verification_token(user=user, db=db, request=request)
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


# ── Login ───────────────────────────────────────────────────────

def login_voter(
    *,
    citizenship_number: str,
    password: str,
    request: Request,
    db: Session,
) -> dict:
    try:
        normalized = normalize_citizenship_number(citizenship_number)
    except (ValueError, HTTPException):
        audit_auth_event(
            action="LOGIN_FAILURE", outcome="FAILURE", request=request,
            metadata={"reason": "invalid_citizenship_format", "portal": "voter"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)

    user = user_repository.get_user_by_citizenship_normalized(db, normalized)
    if not user or not verify_password(password, user.hashed_password):
        audit_auth_event(
            action="LOGIN_FAILURE", outcome="FAILURE",
            target_user_id=user.id if user else None, request=request,
            metadata={"reason": "invalid_credentials", "portal": "voter"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)

    if user.role == "voter" and user.status in {"DISABLED"}:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if user.role != "voter" and user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")

    token = create_access_token(subject=str(user.id), role=user.role, token_version=user.token_version)
    audit_auth_event(
        action="LOGIN_SUCCESS", actor_user_id=user.id, target_user_id=user.id,
        request=request, metadata={"role": user.role, "portal": "voter"},
    )
    return {"access_token": token, "token_type": "bearer"}


def login_admin(
    *,
    citizenship_number: str,
    password: str,
    request: Request,
    db: Session,
) -> dict:
    try:
        normalized = normalize_citizenship_number(citizenship_number)
    except (ValueError, HTTPException):
        audit_auth_event(
            action="LOGIN_FAILURE", outcome="FAILURE", request=request,
            metadata={"reason": "invalid_citizenship_format", "portal": "admin"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)

    user = user_repository.get_user_by_citizenship_normalized(db, normalized)
    if not user or not verify_password(password, user.hashed_password):
        audit_auth_event(
            action="LOGIN_FAILURE", outcome="FAILURE",
            target_user_id=user.id if user else None, request=request,
            metadata={"reason": "invalid_credentials", "portal": "admin"},
        )
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)

    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Access denied: admin accounts only")

    if user.status not in ("ACTIVE", "PENDING_MFA"):
        raise HTTPException(
            status_code=403,
            detail="Admin account pending MFA setup or approval. Please complete MFA enrolment first.",
        )

    token = create_access_token(subject=str(user.id), role=user.role, token_version=user.token_version)
    audit_auth_event(
        action="LOGIN_SUCCESS", actor_user_id=user.id, target_user_id=user.id,
        request=request, metadata={"role": user.role, "portal": "admin"},
    )
    return {"access_token": token, "token_type": "bearer"}


# ── Forgot / Reset password ────────────────────────────────────

def forgot_password(*, email: str, request: Request, db: Session) -> dict:
    client_ip = get_client_ip(request)

    user = user_repository.get_user_by_email(db, email)
    if not user or not user.email:
        audit_auth_event(
            action="PASSWORD_RESET_REQUESTED", outcome="NO_MATCH",
            request=request, metadata={"email": email},
        )
        return GENERIC_FORGOT_PASSWORD_RESPONSE

    now = datetime.now(timezone.utc)
    password_reset_repository.invalidate_active_codes(db, user.id, now)

    raw_code = _generate_numeric_code()
    expires_at = now + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES)
    code_hash = _hash_token(raw_code)

    password_reset_repository.create_reset_code(
        db,
        user_id=user.id,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=client_ip,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.commit()

    try:
        send_password_reset_code(user.email, raw_code, expires_at)
    except EmailDeliveryError as exc:
        detail = exc.public_message
        if exc.fallback_token and settings.EMAIL_DEV_FALLBACK_EXPOSE_TOKEN:
            detail = f"{detail} | DEV RESET CODE: {exc.fallback_token}"
        raise HTTPException(status_code=500, detail=detail) from exc
    except Exception as exc:
        logger.exception("Failed to dispatch password reset code for user_id=%s", user.id)
        raise HTTPException(status_code=500, detail="Password reset email failed to send") from exc

    audit_auth_event(
        action="PASSWORD_RESET_REQUESTED", target_user_id=user.id,
        request=request, metadata={"email": user.email},
    )
    return GENERIC_FORGOT_PASSWORD_RESPONSE


def reset_password(
    *,
    email: str,
    code: str,
    new_password: str,
    confirm_password: str,
    request: Request,
    db: Session,
) -> dict:
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    validate_password_policy(new_password)

    user = user_repository.get_user_by_email(db, email)
    generic_fail = HTTPException(status_code=400, detail=INVALID_OR_EXPIRED_RESET_CODE_DETAIL)
    if not user:
        raise generic_fail

    now = datetime.now(timezone.utc)
    code_hash = _hash_token(code)

    reset_row = password_reset_repository.get_active_code_by_hash(
        db, user_id=user.id, code_hash=code_hash
    )
    if not reset_row:
        raise generic_fail
    if reset_row.attempt_count >= PASSWORD_RESET_MAX_ATTEMPTS:
        raise generic_fail

    reset_row.attempt_count += 1

    if reset_row.expires_at.replace(tzinfo=timezone.utc) < now:
        db.commit()
        raise generic_fail

    reset_row.used_at = now
    user.hashed_password = hash_password(new_password)
    user.token_version += 1

    password_reset_repository.invalidate_other_codes(
        db, user_id=user.id, exclude_id=reset_row.id, now=now
    )
    db.commit()

    try:
        send_password_changed_notification(user.email)
    except Exception:
        logger.exception("Failed to send password changed notification for user_id=%s", user.id)

    audit_auth_event(
        action="PASSWORD_RESET_COMPLETED", target_user_id=user.id,
        request=request, metadata={"email": user.email},
    )
    return _detail_response(PASSWORD_RESET_DETAIL)


# ── Change password ─────────────────────────────────────────────

def change_password(
    *,
    current_password: str,
    new_password: str,
    confirm_new_password: str,
    current_user: User,
    request: Request,
    db: Session,
) -> dict:
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if new_password != confirm_new_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    validate_password_policy(new_password)
    if verify_password(new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="New password must be different from your current password")

    current_user.hashed_password = hash_password(new_password)
    current_user.token_version += 1
    db.commit()

    client_ip = get_client_ip(request)
    logger.info(
        "Password changed user_id=%s role=%s ip=%s user_agent=%s",
        current_user.id, current_user.role, client_ip,
        (request.headers.get("user-agent") or "")[:500],
    )
    audit_auth_event(
        action="PASSWORD_CHANGED",
        actor_user_id=current_user.id,
        target_user_id=current_user.id,
        request=request,
        metadata={"role": current_user.role},
    )
    return {"detail": PASSWORD_CHANGED_DETAIL}


# ── TOTP recovery ──────────────────────────────────────────────

def request_totp_recovery(*, email: str, request: Request, db: Session) -> dict:
    client_ip = get_client_ip(request)

    user = user_repository.get_user_by_email(db, email)
    if not user or not user.email or user.email_verified_at is None:
        return GENERIC_TOTP_RECOVERY_RESPONSE

    now = datetime.now(timezone.utc)
    totp_recovery_repository.invalidate_pending_requests(db, user.id, now)

    raw_code = _generate_numeric_code()
    expires_at = now + timedelta(minutes=TOTP_RECOVERY_TTL_MINUTES)
    code_hash = _hash_token(raw_code)

    totp_recovery_repository.create_recovery_request(
        db,
        user_id=user.id,
        email=user.email,
        role=user.role,
        code_hash=code_hash,
        expires_at=expires_at,
        requested_ip=client_ip,
        requested_user_agent=(request.headers.get("user-agent") or "")[:500] or None,
    )
    db.commit()

    try:
        send_totp_recovery_code(user.email, raw_code, expires_at)
    except EmailDeliveryError as exc:
        detail = exc.public_message
        if exc.fallback_token and settings.EMAIL_DEV_FALLBACK_EXPOSE_TOKEN:
            detail = f"{detail} | DEV TOTP CODE: {exc.fallback_token}"
        raise HTTPException(status_code=500, detail=detail) from exc
    except Exception as exc:
        logger.exception("Failed to send TOTP recovery code for user_id=%s", user.id)
        raise HTTPException(status_code=500, detail="TOTP recovery email failed to send") from exc

    logger.info("TOTP recovery requested user_id=%s role=%s ip=%s", user.id, user.role, client_ip)
    return GENERIC_TOTP_RECOVERY_RESPONSE


def complete_totp_recovery(*, email: str, code: str, request: Request, db: Session) -> dict:
    client_ip = get_client_ip(request)

    user = user_repository.get_user_by_email(db, email)
    generic_fail = HTTPException(status_code=400, detail="Invalid or expired recovery code")
    if not user:
        raise generic_fail

    now = datetime.now(timezone.utc)
    code_hash = _hash_token(code)

    row = totp_recovery_repository.get_pending_by_code_hash(
        db, user_id=user.id, code_hash=code_hash
    )
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

        logger.info("TOTP recovery completed user_id=%s role=%s ip=%s", user.id, user.role, client_ip)
        audit_auth_event(
            action="TOTP_RESET", target_user_id=user.id, request=request,
            metadata={"method": "email_recovery", "role": user.role},
        )
        return {"detail": "TOTP reset completed. Please log in and set up TOTP again.", "status": "COMPLETED"}

    # Admin path: requires super_admin approval
    row.status = "PENDING_APPROVAL"
    db.commit()

    try:
        send_totp_recovery_pending_notice(user.email)
    except Exception:
        logger.exception("Failed to send TOTP recovery pending notice for user_id=%s", user.id)

    logger.info("TOTP recovery awaiting approval user_id=%s role=%s ip=%s", user.id, user.role, client_ip)
    return {"detail": "Recovery request submitted. A super admin must approve TOTP reset.", "status": "PENDING_APPROVAL"}
