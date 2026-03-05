"""
Invite delivery adapter.

Currently a no-op: the activation URL is returned in the API response for the
super_admin to copy/share manually.

When a real email provider is added (e.g. SMTP, SendGrid, Amazon SES), implement
the sending logic inside `send_invite` and call it from the invite-creation
endpoint.  No other code paths need to change.

IMPORTANT: Never log or persist the plaintext invite code / activation URL.
"""

import logging

logger = logging.getLogger(__name__)


def send_invite(recipient_identifier: str, activation_url: str) -> None:
    """Deliver an invite to the recipient.

    Parameters
    ----------
    recipient_identifier:
        Citizenship number or email of the invitee.
    activation_url:
        One-time URL containing the invite code.  **Must not be logged.**

    TODO (SMTP integration):
        Replace the stub below with real delivery, e.g.::

            from app.core.email import send_email
            send_email(
                to=recipient_identifier,
                subject="You have been invited as an admin",
                body=f"Use this link to activate your account: {activation_url}",
            )
    """
    # ── Stub: log that an invite was issued (without leaking the URL) ──
    logger.info(
        "Invite issued for recipient=%s (delivery: copy-link, no email sent)",
        recipient_identifier,
    )
