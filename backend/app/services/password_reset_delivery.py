"""Password reset delivery adapter.

Stub implementation — logs the request until an email provider is configured.
"""

from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def send_password_reset_code(recipient_email: str, reset_code: str, expires_at: datetime) -> None:
    """Deliver a password reset code to the user's email.

    Parameters
    ----------
    recipient_email:
        Email address of the account owner.
    reset_code:
        Raw one-time code. Never persist or log this value.
    expires_at:
        UTC expiry timestamp for the code.
    """
    logger.info(
        "Password reset code requested for recipient=%s expires_at=%s (delivery provider not configured)",
        recipient_email,
        expires_at.isoformat(),
    )


def send_password_changed_notification(recipient_email: str) -> None:
    """Notify the user that their password was changed.

    Parameters
    ----------
    recipient_email:
        Email address of the account owner.
    """
    logger.info(
        "Password changed notification for recipient=%s (delivery provider not configured)",
        recipient_email,
    )
