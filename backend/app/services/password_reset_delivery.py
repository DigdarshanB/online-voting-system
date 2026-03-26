"""Password reset delivery adapter backed by centralized email service."""

from datetime import datetime
import logging

from app.services.email_delivery import EmailDeliveryError, format_expiry, send_email

logger = logging.getLogger(__name__)


def send_password_reset_code(recipient_email: str, reset_code: str, expires_at: datetime) -> None:
    """Deliver a password reset code to the user's email."""
    text_body = (
        "You requested a password reset.\n\n"
        f"Your reset code: {reset_code}\n"
        f"Expires at: {format_expiry(expires_at)}\n\n"
        "If you did not request this, you can ignore this email."
    )

    html_body = f"""
    <html>
      <body style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;\">
        <h2 style=\"margin-bottom: 12px;\">Password reset request</h2>
        <p>Use this one-time code to reset your password:</p>
        <p style=\"font-family: monospace; font-size: 18px; background: #f1f5f9; padding: 10px; border-radius: 6px; display: inline-block;\">{reset_code}</p>
        <p style=\"font-size: 12px; color: #475569;\">Expires at: {format_expiry(expires_at)}</p>
        <p style=\"margin-top: 12px; font-size: 14px; color: #475569;\">If you did not request this, you can ignore this email.</p>
      </body>
    </html>
    """

    send_email(
        to=recipient_email,
        subject="Your password reset code",
        text_body=text_body,
        html_body=html_body,
        public_context="password_reset",
        fallback_token=reset_code,
    )


def send_password_changed_notification(recipient_email: str) -> None:
    """Notify the user that their password was changed."""
    text_body = (
        "Your password was changed.\n\n"
        "If you made this change, no action is needed.\n"
        "If you did not, please reset your password immediately."
    )
    html_body = """
    <html>
      <body style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;\">
        <h2 style=\"margin-bottom: 12px;\">Your password was changed</h2>
        <p>If you made this change, no action is needed.</p>
        <p style=\"margin-top: 12px; color: #b91c1c;\">If you did not, please reset your password immediately.</p>
      </body>
    </html>
    """

    send_email(
        to=recipient_email,
        subject="Your password was changed",
        text_body=text_body,
        html_body=html_body,
        public_context="password_changed_notice",
    )
