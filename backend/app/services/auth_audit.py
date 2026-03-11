import json
import logging
from typing import Any

from fastapi import Request

from app.db.session import SessionLocal
from app.models.auth_audit_log import AuthAuditLog

logger = logging.getLogger(__name__)


def audit_auth_event(
    *,
    action: str,
    actor_user_id: int | None = None,
    target_user_id: int | None = None,
    outcome: str = "SUCCESS",
    request: Request | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Persist an auth audit event using an isolated DB session.

    This helper never raises to callers.
    """
    session = SessionLocal()
    try:
        ip_address = request.client.host if request and request.client else None
        user_agent = (request.headers.get("user-agent") or "")[:500] or None if request else None
        metadata_json = json.dumps(metadata or {}, default=str)

        row = AuthAuditLog(
            actor_user_id=actor_user_id,
            target_user_id=target_user_id,
            action=action,
            outcome=outcome,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=metadata_json,
        )
        session.add(row)
        session.commit()
    except Exception:
        session.rollback()
        logger.exception("Failed to persist auth audit event action=%s", action)
    finally:
        session.close()
