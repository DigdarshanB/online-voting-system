"""Repository for querying auth_audit_logs.

All methods are read-only. Audit records are never modified or deleted
through this layer.
"""

import json
from datetime import date, datetime
from typing import Any

from sqlalchemy import func, distinct, or_, cast, Date, select
from sqlalchemy.orm import Session, aliased

from app.models.auth_audit_log import AuthAuditLog
from app.models.user import User


# ── Action → category mapping (real actions only) ────────────────

_ACTION_CATEGORIES: dict[str, str] = {
    "LOGIN_SUCCESS": "authentication",
    "LOGIN_FAILURE": "authentication",
    "EMAIL_VERIFIED": "authentication",
    "TOTP_ENROLLED": "authentication",
    "TOTP_VERIFIED": "authentication",
    "PASSWORD_CHANGED": "security",
    "PASSWORD_RESET_REQUESTED": "security",
    "PASSWORD_RESET_COMPLETED": "security",
    "PASSWORD_RESET_REQUESTED_BY_ADMIN": "security",
    "TOTP_RESET": "security",
    "TOTP_RESET_BY_ADMIN": "security",
    "TOTP_RECOVERY_APPROVED": "security",
    "TOTP_RECOVERY_REJECTED": "security",
    "ADMIN_ACTIVATION_COMPLETED": "admin_lifecycle",
    "ACCOUNT_APPROVED": "account_management",
    "ACCOUNT_REJECTED": "account_management",
    "ACCOUNT_SUSPENDED": "account_management",
    "ACCOUNT_REACTIVATED": "account_management",
    "ACCOUNT_DEACTIVATED": "account_management",
    "ACCOUNT_DELETED": "account_management",
    "ACCOUNT_UPDATED": "account_management",
    "ACCOUNT_DISABLED": "account_management",
    "ACCOUNT_RECORD_REMOVED": "account_management",
    "BULK_VOTER_ACTION": "account_management",
    "election_created": "election_management",
    "election_open-nomination": "election_management",
    "election_close-nomination": "election_management",
    "election_publish": "election_management",
    "candidate_created": "candidate_management",
}

HIGH_RISK_ACTIONS = {
    "LOGIN_FAILURE",
    "ACCOUNT_DELETED",
    "ACCOUNT_RECORD_REMOVED",
    "ACCOUNT_SUSPENDED",
    "ACCOUNT_DISABLED",
    "PASSWORD_RESET_REQUESTED_BY_ADMIN",
    "TOTP_RESET_BY_ADMIN",
}

SECURITY_ACTIONS = {
    "PASSWORD_CHANGED",
    "PASSWORD_RESET_REQUESTED",
    "PASSWORD_RESET_COMPLETED",
    "PASSWORD_RESET_REQUESTED_BY_ADMIN",
    "TOTP_RESET",
    "TOTP_RESET_BY_ADMIN",
    "TOTP_RECOVERY_APPROVED",
    "TOTP_RECOVERY_REJECTED",
}


def get_category(action: str) -> str:
    return _ACTION_CATEGORIES.get(action, "other")


def _base_filters(q, **kwargs):
    """Apply shared filter predicates to a query."""
    search = kwargs.get("search")
    date_from = kwargs.get("date_from")
    date_to = kwargs.get("date_to")
    action = kwargs.get("action")
    category = kwargs.get("category")
    outcome = kwargs.get("outcome")
    actor_id = kwargs.get("actor_id")
    target_id = kwargs.get("target_id")
    ip_address = kwargs.get("ip_address")
    high_risk_only = kwargs.get("high_risk_only", False)

    if search:
        pattern = f"%{search}%"
        q = q.where(
            or_(
                AuthAuditLog.action.ilike(pattern),
                AuthAuditLog.ip_address.ilike(pattern),
                AuthAuditLog.metadata_json.ilike(pattern),
            )
        )
    if date_from:
        q = q.where(AuthAuditLog.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.where(AuthAuditLog.created_at <= datetime.combine(date_to, datetime.max.time()))
    if action:
        q = q.where(AuthAuditLog.action == action)
    if category:
        actions_in_cat = [a for a, c in _ACTION_CATEGORIES.items() if c == category]
        if actions_in_cat:
            q = q.where(AuthAuditLog.action.in_(actions_in_cat))
        else:
            q = q.where(AuthAuditLog.action == "__IMPOSSIBLE__")
    if outcome:
        q = q.where(AuthAuditLog.outcome == outcome)
    if actor_id is not None:
        q = q.where(AuthAuditLog.actor_user_id == actor_id)
    if target_id is not None:
        q = q.where(AuthAuditLog.target_user_id == target_id)
    if ip_address:
        q = q.where(AuthAuditLog.ip_address.ilike(f"%{ip_address}%"))
    if high_risk_only:
        q = q.where(AuthAuditLog.action.in_(HIGH_RISK_ACTIONS))
    return q


_SENSITIVE_KEYS = {"password", "secret", "token", "totp_secret", "otp"}


def _parse_and_sanitize_meta(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        meta = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {"raw": raw}
    return {
        k: "***REDACTED***" if any(s in k.lower() for s in _SENSITIVE_KEYS) else v
        for k, v in meta.items()
    }


def list_audit_logs(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 50,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    **filters,
) -> dict[str, Any]:
    """Return paginated, filtered audit log list with actor/target names."""
    ActorUser = aliased(User, name="actor")
    TargetUser = aliased(User, name="target")

    count_q = select(func.count(AuthAuditLog.id)).select_from(AuthAuditLog)
    count_q = _base_filters(count_q, **filters)
    total = db.execute(count_q).scalar() or 0

    q = (
        select(
            AuthAuditLog.id,
            AuthAuditLog.actor_user_id,
            AuthAuditLog.target_user_id,
            AuthAuditLog.action,
            AuthAuditLog.outcome,
            AuthAuditLog.ip_address,
            AuthAuditLog.user_agent,
            AuthAuditLog.metadata_json,
            AuthAuditLog.created_at,
            ActorUser.full_name.label("actor_name"),
            ActorUser.role.label("actor_role"),
            TargetUser.full_name.label("target_name"),
            TargetUser.role.label("target_role"),
        )
        .outerjoin(ActorUser, AuthAuditLog.actor_user_id == ActorUser.id)
        .outerjoin(TargetUser, AuthAuditLog.target_user_id == TargetUser.id)
    )
    q = _base_filters(q, **filters)

    sort_col = getattr(AuthAuditLog, sort_by, AuthAuditLog.created_at)
    q = q.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())
    q = q.offset((page - 1) * page_size).limit(page_size)

    rows = db.execute(q).all()

    items = []
    for r in rows:
        items.append({
            "id": r.id,
            "actor_user_id": r.actor_user_id,
            "actor_name": r.actor_name or (f"User #{r.actor_user_id}" if r.actor_user_id else None),
            "actor_role": r.actor_role,
            "target_user_id": r.target_user_id,
            "target_name": r.target_name or (f"User #{r.target_user_id}" if r.target_user_id else None),
            "target_role": r.target_role,
            "action": r.action,
            "category": get_category(r.action),
            "outcome": r.outcome,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "metadata": _parse_and_sanitize_meta(r.metadata_json),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size else 0,
    }


def get_audit_log_detail(db: Session, log_id: int) -> dict[str, Any] | None:
    """Return a single audit log entry with full detail."""
    ActorUser = aliased(User, name="actor")
    TargetUser = aliased(User, name="target")

    q = (
        select(
            AuthAuditLog.id,
            AuthAuditLog.actor_user_id,
            AuthAuditLog.target_user_id,
            AuthAuditLog.action,
            AuthAuditLog.outcome,
            AuthAuditLog.ip_address,
            AuthAuditLog.user_agent,
            AuthAuditLog.metadata_json,
            AuthAuditLog.created_at,
            ActorUser.full_name.label("actor_name"),
            ActorUser.email.label("actor_email"),
            ActorUser.role.label("actor_role"),
            TargetUser.full_name.label("target_name"),
            TargetUser.email.label("target_email"),
            TargetUser.role.label("target_role"),
        )
        .outerjoin(ActorUser, AuthAuditLog.actor_user_id == ActorUser.id)
        .outerjoin(TargetUser, AuthAuditLog.target_user_id == TargetUser.id)
        .where(AuthAuditLog.id == log_id)
    )

    r = db.execute(q).first()
    if not r:
        return None

    return {
        "id": r.id,
        "actor_user_id": r.actor_user_id,
        "actor_name": r.actor_name or (f"User #{r.actor_user_id}" if r.actor_user_id else None),
        "actor_email": r.actor_email,
        "actor_role": r.actor_role,
        "target_user_id": r.target_user_id,
        "target_name": r.target_name or (f"User #{r.target_user_id}" if r.target_user_id else None),
        "target_email": r.target_email,
        "target_role": r.target_role,
        "action": r.action,
        "category": get_category(r.action),
        "outcome": r.outcome,
        "ip_address": r.ip_address,
        "user_agent": r.user_agent,
        "metadata": _parse_and_sanitize_meta(r.metadata_json),
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def get_audit_summary(db: Session, **filters) -> dict[str, Any]:
    """Return aggregated KPI data from real audit records."""
    total_q = select(func.count(AuthAuditLog.id)).select_from(AuthAuditLog)
    total_q = _base_filters(total_q, **filters)
    total_events = db.execute(total_q).scalar() or 0

    failed_q = select(func.count(AuthAuditLog.id)).select_from(AuthAuditLog).where(
        AuthAuditLog.outcome == "FAILURE"
    )
    failed_q = _base_filters(failed_q, **filters)
    failed_events = db.execute(failed_q).scalar() or 0

    admin_q = (
        select(func.count(AuthAuditLog.id))
        .select_from(AuthAuditLog)
        .join(User, AuthAuditLog.actor_user_id == User.id)
        .where(User.role.in_(["admin", "super_admin"]))
    )
    admin_q = _base_filters(admin_q, **filters)
    admin_actions = db.execute(admin_q).scalar() or 0

    security_q = select(func.count(AuthAuditLog.id)).select_from(AuthAuditLog).where(
        AuthAuditLog.action.in_(SECURITY_ACTIONS)
    )
    security_q = _base_filters(security_q, **filters)
    security_events = db.execute(security_q).scalar() or 0

    affected_q = select(func.count(distinct(AuthAuditLog.target_user_id))).select_from(AuthAuditLog).where(
        AuthAuditLog.target_user_id.isnot(None)
    )
    affected_q = _base_filters(affected_q, **filters)
    affected_accounts = db.execute(affected_q).scalar() or 0

    today = date.today()
    today_q = select(func.count(AuthAuditLog.id)).select_from(AuthAuditLog).where(
        cast(AuthAuditLog.created_at, Date) == today
    )
    today_activity = db.execute(today_q).scalar() or 0

    action_q = (
        select(AuthAuditLog.action, func.count(AuthAuditLog.id).label("count"))
        .select_from(AuthAuditLog)
        .group_by(AuthAuditLog.action)
    )
    action_q = _base_filters(action_q, **filters)
    action_breakdown = {r.action: r.count for r in db.execute(action_q).all()}

    outcome_q = (
        select(AuthAuditLog.outcome, func.count(AuthAuditLog.id).label("count"))
        .select_from(AuthAuditLog)
        .group_by(AuthAuditLog.outcome)
    )
    outcome_q = _base_filters(outcome_q, **filters)
    outcome_breakdown = {r.outcome: r.count for r in db.execute(outcome_q).all()}

    category_breakdown: dict[str, int] = {}
    for action_name, count in action_breakdown.items():
        cat = get_category(action_name)
        category_breakdown[cat] = category_breakdown.get(cat, 0) + count

    distinct_actions = [r[0] for r in db.execute(
        select(distinct(AuthAuditLog.action)).select_from(AuthAuditLog).order_by(AuthAuditLog.action)
    ).all()]
    distinct_outcomes = [r[0] for r in db.execute(
        select(distinct(AuthAuditLog.outcome)).select_from(AuthAuditLog).order_by(AuthAuditLog.outcome)
    ).all()]

    return {
        "total_events": total_events,
        "failed_events": failed_events,
        "admin_actions": admin_actions,
        "security_events": security_events,
        "affected_accounts": affected_accounts,
        "today_activity": today_activity,
        "action_breakdown": action_breakdown,
        "outcome_breakdown": outcome_breakdown,
        "category_breakdown": category_breakdown,
        "available_actions": distinct_actions,
        "available_outcomes": distinct_outcomes,
        "available_categories": sorted(set(_ACTION_CATEGORIES.values())),
    }


def export_audit_logs(db: Session, **filters) -> list[dict[str, Any]]:
    """Return all matching audit records for export (max 10000)."""
    ActorUser = aliased(User, name="actor")
    TargetUser = aliased(User, name="target")

    q = (
        select(
            AuthAuditLog.id,
            AuthAuditLog.actor_user_id,
            AuthAuditLog.target_user_id,
            AuthAuditLog.action,
            AuthAuditLog.outcome,
            AuthAuditLog.ip_address,
            AuthAuditLog.user_agent,
            AuthAuditLog.metadata_json,
            AuthAuditLog.created_at,
            ActorUser.full_name.label("actor_name"),
            TargetUser.full_name.label("target_name"),
        )
        .outerjoin(ActorUser, AuthAuditLog.actor_user_id == ActorUser.id)
        .outerjoin(TargetUser, AuthAuditLog.target_user_id == TargetUser.id)
        .order_by(AuthAuditLog.created_at.desc())
    )
    q = _base_filters(q, **filters)
    q = q.limit(10000)

    rows = db.execute(q).all()
    return [
        {
            "id": r.id,
            "timestamp": r.created_at.isoformat() if r.created_at else None,
            "action": r.action,
            "category": get_category(r.action),
            "outcome": r.outcome,
            "actor_id": r.actor_user_id,
            "actor_name": r.actor_name,
            "target_id": r.target_user_id,
            "target_name": r.target_name,
            "ip_address": r.ip_address,
            "user_agent": r.user_agent,
            "metadata": _parse_and_sanitize_meta(r.metadata_json),
        }
        for r in rows
    ]
