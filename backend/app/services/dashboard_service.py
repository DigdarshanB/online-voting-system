"""Dashboard service – aggregation queries for admin dashboard."""

from datetime import datetime

from fastapi import HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.election import Election
from app.models.user import User
from app.models.vote import Vote
from app.repositories import election_repository, vote_repository


def get_dashboard_summary(db: Session) -> dict:
    active_elections = election_repository.count_by_status(db, "POLLING_OPEN")
    scheduled_elections = election_repository.count_by_status(db, "CONFIGURED")

    registered_voters = db.execute(
        select(func.count()).select_from(User).where(User.role == "voter")
    ).scalar_one()

    pending_verifications = db.execute(
        select(func.count()).select_from(User).where(
            User.role == "voter", User.status == "PENDING_REVIEW"
        )
    ).scalar_one()

    total_votes_cast = vote_repository.count_all(db)

    return {
        "active_elections": int(active_elections or 0),
        "scheduled_elections": int(scheduled_elections or 0),
        "registered_voters": int(registered_voters or 0),
        "pending_verifications": int(pending_verifications or 0),
        "total_votes_cast": int(total_votes_cast or 0),
    }


def get_election_status_distribution(db: Session) -> dict:
    counts = election_repository.count_grouped_by_status(db)

    status_meta = [
        ("DRAFT", "Draft", "#94A3B8"),
        ("CONFIGURED", "Configured", "#8B5CF6"),
        ("NOMINATIONS_OPEN", "Nominations Open", "#06B6D4"),
        ("NOMINATIONS_CLOSED", "Nominations Closed", "#0EA5E9"),
        ("CANDIDATE_LIST_PUBLISHED", "Candidates Published", "#2563EB"),
        ("POLLING_OPEN", "Polling Open", "#16A34A"),
        ("POLLING_CLOSED", "Polling Closed", "#F59E0B"),
        ("COUNTING", "Counting", "#EA580C"),
        ("FINALIZED", "Finalized", "#059669"),
        ("ARCHIVED", "Archived", "#6B7280"),
    ]

    items = [
        {
            "status": status,
            "label": label,
            "value": counts.get(status, 0),
            "color": color,
        }
        for status, label, color in status_meta
    ]

    total = sum(item["value"] for item in items)
    return {"items": items, "total": total}


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _shift_months(month_start: datetime, months: int) -> datetime:
    total_months = month_start.year * 12 + (month_start.month - 1) + months
    year = total_months // 12
    month = (total_months % 12) + 1
    return month_start.replace(year=year, month=month)


def get_registration_activity(time_range: str, db: Session) -> dict:
    range_to_months = {"30d": 1, "90d": 3, "6m": 6, "12m": 12}

    if time_range not in range_to_months:
        raise HTTPException(status_code=400, detail="Invalid range")

    months_count = range_to_months[time_range]
    now = datetime.utcnow()
    current_month = _month_start(now)
    start_month = _shift_months(current_month, -(months_count - 1))
    next_month = _shift_months(current_month, 1)

    month_expr = func.date_format(User.created_at, "%Y-%m")
    rows = db.execute(
        select(month_expr.label("month_key"), func.count(User.id))
        .where(
            User.role == "voter",
            User.created_at >= start_month,
            User.created_at < next_month,
        )
        .group_by(month_expr)
    ).all()

    counts_by_month = {month_key: int(count or 0) for month_key, count in rows}

    items = []
    for idx in range(months_count):
        month_dt = _shift_months(start_month, idx)
        month_key = month_dt.strftime("%Y-%m")
        items.append({
            "month_key": month_key,
            "month_label": month_dt.strftime("%b"),
            "count": counts_by_month.get(month_key, 0),
        })

    total = sum(point["count"] for point in items)
    return {"range": time_range, "items": items, "total": total}
