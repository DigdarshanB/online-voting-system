"""TOTP recovery delivery adapter.

Stub implementation until an email provider is integrated.
"""

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def send_totp_recovery_code(recipient_email: str, recovery_code: str, expires_at: datetime) -> None:
    """Deliver a TOTP recovery code. Never log the raw code."""
    logger.info(
        "TOTP recovery code requested for recipient=%s expires_at=%s (delivery provider not configured)",
        recipient_email,
        expires_at.isoformat(),
    )


def send_totp_recovery_pending_notice(recipient_email: str) -> None:
    """Notify the admin that the request is pending super-admin approval."""
    logger.info(
        "TOTP recovery pending approval notice recipient=%s (delivery provider not configured)",
        recipient_email,
    )


def send_totp_recovery_completed_notice(recipient_email: str) -> None:
    """Notify the user that TOTP recovery was completed."""
    logger.info(
        "TOTP recovery completed notice recipient=%s (delivery provider not configured)",
        recipient_email,
    )


def send_totp_recovery_rejected_notice(recipient_email: str) -> None:
    """Notify the admin that a super-admin rejected their recovery request."""
    logger.info(
        "TOTP recovery rejected notice recipient=%s (delivery provider not configured)",
        recipient_email,
    )
