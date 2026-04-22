"""Centralized email delivery: SMTP with an explicit dev fallback.

Every email-based flow goes through this module. Codes/tokens are only
exposed via the dev fallback when the relevant setting is enabled.
"""

from datetime import datetime
from email.message import EmailMessage
import logging
import smtplib
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Raised when email delivery fails.

    public_message is safe to surface to API callers. fallback_token is an
    optional code/token value that can be exposed only in development flows.
    """

    def __init__(self, public_message: str, fallback_token: str | None = None):
        super().__init__(public_message)
        self.public_message = public_message
        self.fallback_token = fallback_token


def _strip(val: Optional[str]) -> Optional[str]:
    return val.strip() if isinstance(val, str) else val


def _validate_smtp_settings() -> None:
    host = _strip(settings.SMTP_HOST)
    username = _strip(settings.SMTP_USERNAME)
    password = _strip(settings.SMTP_PASSWORD)
    from_email = _strip(settings.SMTP_FROM_EMAIL)

    if not host or not from_email:
        raise EmailDeliveryError("SMTP is not configured (missing host or from address)")
    if settings.SMTP_USE_TLS and settings.SMTP_USE_SSL:
        raise EmailDeliveryError("Invalid SMTP config: both TLS and SSL enabled")
    if settings.SMTP_USE_TLS is False and settings.SMTP_USE_SSL is False:
        logger.warning("SMTP neither TLS nor SSL enabled; provider may reject connection")
    if username and "@" not in username:
        raise EmailDeliveryError("SMTP_USERNAME should be an email address for most providers")
    if (username and not password) or (password and not username):
        raise EmailDeliveryError("SMTP username/password must both be set or both be empty")


def _send_via_smtp(message: EmailMessage) -> None:
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
        return

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
        server.ehlo()
        if settings.SMTP_USE_TLS:
            server.starttls()
            server.ehlo()
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)


def _build_message(to: str, subject: str, text_body: str, html_body: str | None) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = (
        f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        if settings.SMTP_FROM_NAME
        else settings.SMTP_FROM_EMAIL
    )
    msg["To"] = to
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")
    return msg


def send_email(
    *,
    to: str,
    subject: str,
    text_body: str,
    html_body: str | None = None,
    public_context: str,
    fallback_token: str | None = None,
) -> None:
    """Send a single email via SMTP. Raises EmailDeliveryError on failure.

    public_context: short label for logs (e.g., "password_reset", "verify_email").
    fallback_token: optional code/token to expose in dev fallback mode.
    """
    try:
        _validate_smtp_settings()
        message = _build_message(to, subject, text_body, html_body)
        _send_via_smtp(message)
        logger.info("Email sent context=%s to=%s", public_context, to)
    except EmailDeliveryError as exc:
        if settings.EMAIL_DEV_FALLBACK:
            logger.warning(
                "DEV EMAIL FALLBACK context=%s to=%s fallback_token=%s error=%s",
                public_context,
                to,
                fallback_token,
                exc.public_message,
            )
            raise EmailDeliveryError(exc.public_message, fallback_token=fallback_token or exc.fallback_token) from exc
        raise
    except Exception as exc:  # SMTP/library failures
        if settings.EMAIL_DEV_FALLBACK:
            logger.warning(
                "DEV EMAIL FALLBACK context=%s to=%s fallback_token=%s error=%s",
                public_context,
                to,
                fallback_token,
                exc,
            )
            raise EmailDeliveryError(f"SMTP delivery failed: {exc}", fallback_token=fallback_token) from exc
        raise EmailDeliveryError(f"SMTP delivery failed: {exc}") from exc
    except BaseException as exc:
        raise EmailDeliveryError(f"Email delivery crashed: {exc}", fallback_token=fallback_token) from exc


def format_expiry(expires_at: datetime) -> str:
    return expires_at.replace(microsecond=0).isoformat()
