"""Admin audit log routes — read-only access to system audit trail.

Access: super_admin only.
All endpoints are read-only. No mutations.

Endpoints:
  GET  /admin/audit/logs          — paginated, filtered audit log list
  GET  /admin/audit/logs/{id}     — single audit log detail
  GET  /admin/audit/summary       — aggregated KPI summary
  GET  /admin/audit/export        — filtered export (JSON)
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.repositories.auth_audit_repository import (
    list_audit_logs,
    get_audit_log_detail,
    get_audit_summary,
    export_audit_logs,
)

router = APIRouter(prefix="/admin/audit", tags=["admin-audit"])


def _require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


def _parse_filters(
    search: Optional[str] = Query(None, max_length=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    action: Optional[str] = Query(None, max_length=80),
    category: Optional[str] = Query(None, max_length=40),
    outcome: Optional[str] = Query(None, max_length=20),
    actor_id: Optional[int] = Query(None),
    target_id: Optional[int] = Query(None),
    ip_address: Optional[str] = Query(None, max_length=64),
    high_risk_only: bool = Query(False),
) -> dict:
    return {
        k: v
        for k, v in {
            "search": search,
            "date_from": date_from,
            "date_to": date_to,
            "action": action,
            "category": category,
            "outcome": outcome,
            "actor_id": actor_id,
            "target_id": target_id,
            "ip_address": ip_address,
            "high_risk_only": high_risk_only,
        }.items()
        if v is not None and v is not False
    }


@router.get("/logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(None, max_length=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    action: Optional[str] = Query(None, max_length=80),
    category: Optional[str] = Query(None, max_length=40),
    outcome: Optional[str] = Query(None, max_length=20),
    actor_id: Optional[int] = Query(None),
    target_id: Optional[int] = Query(None),
    ip_address: Optional[str] = Query(None, max_length=64),
    high_risk_only: bool = Query(False),
    user: User = Depends(_require_super_admin),
    db: Session = Depends(get_db),
):
    filters = {}
    if search:
        filters["search"] = search
    if date_from:
        filters["date_from"] = date_from
    if date_to:
        filters["date_to"] = date_to
    if action:
        filters["action"] = action
    if category:
        filters["category"] = category
    if outcome:
        filters["outcome"] = outcome
    if actor_id is not None:
        filters["actor_id"] = actor_id
    if target_id is not None:
        filters["target_id"] = target_id
    if ip_address:
        filters["ip_address"] = ip_address
    if high_risk_only:
        filters["high_risk_only"] = True

    # Validate sort_by to prevent injection
    allowed_sorts = {"created_at", "action", "outcome", "id"}
    if sort_by not in allowed_sorts:
        sort_by = "created_at"

    return list_audit_logs(
        db,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_dir=sort_dir,
        **filters,
    )


@router.get("/logs/{log_id}")
def get_audit_log(
    log_id: int,
    user: User = Depends(_require_super_admin),
    db: Session = Depends(get_db),
):
    detail = get_audit_log_detail(db, log_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    return detail


@router.get("/summary")
def get_summary(
    search: Optional[str] = Query(None, max_length=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    action: Optional[str] = Query(None, max_length=80),
    category: Optional[str] = Query(None, max_length=40),
    outcome: Optional[str] = Query(None, max_length=20),
    actor_id: Optional[int] = Query(None),
    target_id: Optional[int] = Query(None),
    ip_address: Optional[str] = Query(None, max_length=64),
    high_risk_only: bool = Query(False),
    user: User = Depends(_require_super_admin),
    db: Session = Depends(get_db),
):
    filters = {}
    if search:
        filters["search"] = search
    if date_from:
        filters["date_from"] = date_from
    if date_to:
        filters["date_to"] = date_to
    if action:
        filters["action"] = action
    if category:
        filters["category"] = category
    if outcome:
        filters["outcome"] = outcome
    if actor_id is not None:
        filters["actor_id"] = actor_id
    if target_id is not None:
        filters["target_id"] = target_id
    if ip_address:
        filters["ip_address"] = ip_address
    if high_risk_only:
        filters["high_risk_only"] = True

    return get_audit_summary(db, **filters)


@router.get("/export")
def export_logs(
    search: Optional[str] = Query(None, max_length=200),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    action: Optional[str] = Query(None, max_length=80),
    category: Optional[str] = Query(None, max_length=40),
    outcome: Optional[str] = Query(None, max_length=20),
    actor_id: Optional[int] = Query(None),
    target_id: Optional[int] = Query(None),
    ip_address: Optional[str] = Query(None, max_length=64),
    high_risk_only: bool = Query(False),
    user: User = Depends(_require_super_admin),
    db: Session = Depends(get_db),
):
    filters = {}
    if search:
        filters["search"] = search
    if date_from:
        filters["date_from"] = date_from
    if date_to:
        filters["date_to"] = date_to
    if action:
        filters["action"] = action
    if category:
        filters["category"] = category
    if outcome:
        filters["outcome"] = outcome
    if actor_id is not None:
        filters["actor_id"] = actor_id
    if target_id is not None:
        filters["target_id"] = target_id
    if ip_address:
        filters["ip_address"] = ip_address
    if high_risk_only:
        filters["high_risk_only"] = True

    return export_audit_logs(db, **filters)
