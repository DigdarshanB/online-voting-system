"""Email verification delivery adapter.

This module provides a narrow abstraction for sending verification tokens.
The current implementation is intentionally a no-op logger until an actual
email provider is integrated.
"""

from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def send_email_verification(recipient_email: str, verification_token: str, expires_at: datetime) -> None:
    """Deliver an email verification token.

    Parameters
    ----------
    recipient_email:
        Email address of the account owner.
    verification_token:
        Raw one-time token. Never persist or log this value.
    expires_at:
        UTC expiry timestamp for the token.
    """
    logger.info(
        "Email verification requested for recipient=%s expires_at=%s (delivery provider not configured)",
        recipient_email,
        expires_at.isoformat(),
    )
