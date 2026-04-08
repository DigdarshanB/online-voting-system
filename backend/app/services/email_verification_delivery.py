"""Email verification delivery built on the centralized email service."""

from datetime import datetime
import logging

from app.core.config import settings
from app.services.email_delivery import EmailDeliveryError, format_expiry, send_email

logger = logging.getLogger(__name__)


# ── Admin email verification ────────────────────────────────────

def _build_admin_bodies(recipient_email: str, verification_token: str, expires_at: datetime) -> tuple[str, str]:
    verify_link = f"{settings.ADMIN_FRONTEND_URL.rstrip('/')}/verify-email?token={verification_token}"

    text_body = (
        "Verify your admin email address\n\n"
        "Click this link to verify your email:\n"
        f"{verify_link}\n\n"
        "If the link does not open, paste this verification token in the app:\n"
        f"{verification_token}\n\n"
        f"This token expires at: {format_expiry(expires_at)}\n"
    )

    html_body = f"""
    <html>
      <body style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;\">
        <h2 style=\"margin-bottom: 12px;\">Verify your admin email address</h2>
        <p>Please confirm your email to continue setup.</p>
        <p>
          <a href=\"{verify_link}\" style=\"display:inline-block;padding:10px 16px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;\">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, use this token in the app:</p>
        <p style=\"font-family: monospace; font-size: 14px; background: #f1f5f9; padding: 8px; border-radius: 6px;\">{verification_token}</p>
        <p style=\"font-size: 12px; color: #475569;\">Expires at: {format_expiry(expires_at)}</p>
      </body>
    </html>
    """
    return text_body, html_body


def send_email_verification(recipient_email: str, verification_token: str, expires_at: datetime) -> None:
    """Deliver an admin email verification token.

    Raises EmailDeliveryError on failure. In dev fallback mode, logs the token so
    local testing can proceed even without working SMTP.
    """
    text_body, html_body = _build_admin_bodies(recipient_email, verification_token, expires_at)
    send_email(
        to=recipient_email,
        subject="Verify your Online Voting System admin email",
        text_body=text_body,
        html_body=html_body,
        public_context="verify_email",
        fallback_token=verification_token,
    )


def send_email_verification_with_fallback(
    recipient_email: str,
    verification_token: str,
    expires_at: datetime,
) -> None:
    """Deliver admin verification email; in dev fallback, log token and succeed silently."""
    try:
        send_email_verification(recipient_email, verification_token, expires_at)
    except EmailDeliveryError as exc:
        if settings.EMAIL_DEV_FALLBACK:
            logger.warning(
                "DEV EMAIL FALLBACK: verification token for %s = %s (expires %s)",
                recipient_email,
                verification_token,
                expires_at.isoformat(),
            )
            return
        raise


# ── Voter registration email verification ───────────────────────

def _build_voter_bodies(recipient_email: str, verification_token: str, expires_at: datetime) -> tuple[str, str]:
    text_body = (
        "Online Voting System — Verify your email address\n\n"
        "Thank you for registering as a voter.\n\n"
        "Your email verification code is:\n"
        f"{verification_token}\n\n"
        "Please paste this code in the registration verification page to continue.\n\n"
        f"This code expires at: {format_expiry(expires_at)}\n\n"
        "If you did not register, you can safely ignore this email.\n"
    )

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 520px; margin: 0 auto;">
        <h2 style="margin-bottom: 12px; color: #1e3a8a;">Verify your email address</h2>
        <p>Thank you for registering as a voter in the Online Voting System.</p>
        <p>Your email verification code is:</p>
        <p style="font-family: monospace; font-size: 18px; font-weight: bold; background: #f1f5f9; padding: 14px 18px; border-radius: 8px; border-left: 4px solid #2563eb; letter-spacing: 1px; word-break: break-all;">{verification_token}</p>
        <p>Paste this code in the registration verification page to continue with your voter registration.</p>
        <p style="font-size: 12px; color: #475569;">This code expires at: {format_expiry(expires_at)}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">If you did not register, you can safely ignore this email.</p>
      </body>
    </html>
    """
    return text_body, html_body


def send_voter_email_verification(recipient_email: str, verification_token: str, expires_at: datetime) -> None:
    """Deliver a voter registration email verification token via SMTP.

    Raises EmailDeliveryError on failure.
    """
    text_body, html_body = _build_voter_bodies(recipient_email, verification_token, expires_at)
    send_email(
        to=recipient_email,
        subject="Verify your email — Online Voting System",
        text_body=text_body,
        html_body=html_body,
        public_context="voter_verify_email",
        fallback_token=verification_token,
    )


def send_voter_email_verification_with_fallback(
    recipient_email: str,
    verification_token: str,
    expires_at: datetime,
) -> bool:
    """Deliver voter verification email. Returns True if actually sent via SMTP.

    When SMTP is not configured and EMAIL_DEV_FALLBACK is True, logs the token
    to the server console and returns False (so callers know email was NOT sent).
    When EMAIL_DEV_FALLBACK is False, re-raises the EmailDeliveryError.
    """
    try:
        send_voter_email_verification(recipient_email, verification_token, expires_at)
        return True
    except EmailDeliveryError as exc:
        if settings.EMAIL_DEV_FALLBACK:
            logger.warning(
                "DEV EMAIL FALLBACK (voter): verification token for %s = %s (expires %s). "
                "Configure SMTP_HOST and SMTP_FROM_EMAIL in .env to send real emails.",
                recipient_email,
                verification_token,
                expires_at.isoformat(),
            )
            return False
        raise
