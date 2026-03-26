"""Admin invite delivery using centralized email service."""

from app.services.email_delivery import send_email


def send_invite(recipient_identifier: str, activation_url: str) -> None:
    """Deliver an invite to the recipient via email.

    The activation URL is sensitive; it is not logged. In dev fallback mode,
    the caller may choose to expose it explicitly.
    """

    text_body = (
        "You have been invited to the Online Voting System admin portal.\n\n"
        "Use the activation link below to set up your account:\n"
        f"{activation_url}\n\n"
        "If you did not expect this invite, you can ignore this email."
    )
    html_body = (
        "<html><body style=\"font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;\">"
        "<h2 style=\"margin-bottom: 12px;\">Admin invite</h2>"
        "<p>Use this link to activate your account:</p>"
        f"<p><a href=\"{activation_url}\" style=\"display:inline-block;padding:10px 16px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;\">Activate Admin Account</a></p>"
        "<p style=\"margin-top: 12px; font-size: 14px; color: #475569;\">If the button does not work, copy and paste the link above.</p>"
        "</body></html>"
    )

    # Do not log activation_url; rely on caller to surface fallback token if needed.
    send_email(
        to=recipient_identifier,
        subject="You're invited as an admin",
        text_body=text_body,
        html_body=html_body,
        public_context="admin_invite",
        fallback_token=activation_url,
    )
