"""TOTP recovery delivery using centralized email service."""

import logging
from datetime import datetime

from app.services.email_delivery import format_expiry, send_email

logger = logging.getLogger(__name__)


def send_totp_recovery_code(recipient_email: str, recovery_code: str, expires_at: datetime) -> None:
    text_body = (
        "A TOTP recovery was requested for your account.\n\n"
        f"Recovery code: {recovery_code}\n"
        f"Expires at: {format_expiry(expires_at)}\n\n"
        "If you did not request this, contact an administrator immediately."
    )
    html_body = f"""
    <html>
      <body style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;\">
        <h2 style=\"margin-bottom: 12px;\">TOTP recovery requested</h2>
        <p>Use this code to proceed with TOTP recovery:</p>
        <p style=\"font-family: monospace; font-size: 18px; background: #f1f5f9; padding: 10px; border-radius: 6px; display: inline-block;\">{recovery_code}</p>
        <p style=\"font-size: 12px; color: #475569;\">Expires at: {format_expiry(expires_at)}</p>
        <p style=\"margin-top: 12px; font-size: 14px; color: #b91c1c;\">If you did not request this, contact an administrator immediately.</p>
      </body>
    </html>
    """

    send_email(
        to=recipient_email,
        subject="Your TOTP recovery code",
        text_body=text_body,
        html_body=html_body,
        public_context="totp_recovery_code",
        fallback_token=recovery_code,
    )


def send_totp_recovery_pending_notice(recipient_email: str) -> None:
    text_body = "Your TOTP recovery request is pending approval by a super admin."
    send_email(
        to=recipient_email,
        subject="TOTP recovery pending approval",
        text_body=text_body,
        html_body=None,
        public_context="totp_recovery_pending",
    )


def send_totp_recovery_completed_notice(recipient_email: str) -> None:
    text_body = "Your TOTP recovery completed successfully. Please log in and reconfigure TOTP."
    send_email(
        to=recipient_email,
        subject="TOTP recovery completed",
        text_body=text_body,
        html_body=None,
        public_context="totp_recovery_completed",
    )


def send_totp_recovery_rejected_notice(recipient_email: str) -> None:
    text_body = "Your TOTP recovery request was rejected by a super admin."
    send_email(
        to=recipient_email,
        subject="TOTP recovery rejected",
        text_body=text_body,
        html_body=None,
        public_context="totp_recovery_rejected",
    )
