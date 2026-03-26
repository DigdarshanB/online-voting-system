"""Email verification delivery built on the centralized email service."""

from datetime import datetime
import logging

from app.core.config import settings
from app.services.email_delivery import EmailDeliveryError, format_expiry, send_email

logger = logging.getLogger(__name__)


def _build_bodies(recipient_email: str, verification_token: str, expires_at: datetime) -> tuple[str, str]:
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
    """Deliver an email verification token.

    Raises EmailDeliveryError on failure. In dev fallback mode, logs the token so
    local testing can proceed even without working SMTP.
    """
    text_body, html_body = _build_bodies(recipient_email, verification_token, expires_at)
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
    """Deliver verification email; in dev fallback, log token instead of silently succeeding."""
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
            raise EmailDeliveryError(exc.public_message, fallback_token=verification_token) from exc
        raise
