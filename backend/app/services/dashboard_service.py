"""Dashboard service – aggregation queries for admin dashboard."""

from datetime import datetime

from fastapi import HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ballot import Ballot
from app.models.count_run import CountRun
from app.models.election import Election
from app.models.pending_voter_registration import PendingVoterRegistration
from app.models.user import User
from app.repositories import ballot_repository, election_repository


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

    total_votes_cast = db.execute(
        select(func.count()).select_from(Ballot)
    ).scalar_one()

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


# ── Scheduled elections list ─────────────────────────────────────

# Elections that are not yet finalized/archived — i.e. in any active lifecycle phase.
_UPCOMING_STATUSES = (
    "CONFIGURED",
    "NOMINATIONS_OPEN",
    "NOMINATIONS_CLOSED",
    "CANDIDATE_LIST_PUBLISHED",
    "POLLING_OPEN",
    "POLLING_CLOSED",
    "COUNTING",
)


def get_scheduled_elections_list(db: Session, *, limit: int = 10) -> list[dict]:
    """Return upcoming/active elections with metadata for the dashboard panel."""
    rows = db.execute(
        select(Election)
        .where(Election.status.in_(_UPCOMING_STATUSES))
        .order_by(Election.start_time.asc())
        .limit(limit)
    ).scalars().all()

    items = []
    for e in rows:
        items.append({
            "id": e.id,
            "title": e.title,
            "status": e.status,
            "government_level": e.government_level or "",
            "election_subtype": e.election_subtype or "",
            "start_time": e.start_time.isoformat() if e.start_time else None,
            "end_time": e.end_time.isoformat() if e.end_time else None,
            "polling_start_at": e.polling_start_at.isoformat() if e.polling_start_at else None,
            "polling_end_at": e.polling_end_at.isoformat() if e.polling_end_at else None,
            "province_code": e.province_code,
        })
    return items


# ── System operational status ────────────────────────────────────

def get_system_status(db: Session) -> dict:
    """Aggregate real operational signals for the dashboard status panel."""
    # Election counts by phase
    status_counts = election_repository.count_grouped_by_status(db)
    active_elections = status_counts.get("POLLING_OPEN", 0)
    counting_elections = status_counts.get("COUNTING", 0)
    configured_elections = status_counts.get("CONFIGURED", 0)
    nominations_open = status_counts.get("NOMINATIONS_OPEN", 0)

    # Pending verifications (from pending_voter_registrations table)
    pending_reviews = db.execute(
        select(func.count()).select_from(PendingVoterRegistration)
        .where(PendingVoterRegistration.status == "PENDING_REVIEW")
    ).scalar_one()

    # Total registered voters
    total_voters = db.execute(
        select(func.count()).select_from(User).where(User.role == "voter")
    ).scalar_one()

    # Total ballots cast
    total_ballots = db.execute(
        select(func.count()).select_from(Ballot)
    ).scalar_one()

    # Count runs needing attention (not finalized)
    pending_count_runs = db.execute(
        select(func.count()).select_from(CountRun)
        .where(CountRun.is_final == False)
    ).scalar_one()

    # Finalized elections
    finalized_elections = status_counts.get("FINALIZED", 0)

    # Total elections
    total_elections = sum(status_counts.values())

    # Derive overall health
    alerts = []
    if pending_reviews > 0:
        alerts.append({
            "type": "warning",
            "message": f"{pending_reviews} voter registration(s) awaiting review",
        })
    if counting_elections > 0:
        alerts.append({
            "type": "info",
            "message": f"{counting_elections} election(s) in counting phase",
        })
    if pending_count_runs > 0:
        alerts.append({
            "type": "warning",
            "message": f"{pending_count_runs} count run(s) pending finalization",
        })

    overall = "healthy"
    if pending_reviews > 25 or pending_count_runs > 5:
        overall = "attention"
    if active_elections == 0 and counting_elections == 0 and configured_elections == 0:
        overall = "idle"

    return {
        "overall": overall,
        "active_elections": int(active_elections),
        "counting_elections": int(counting_elections),
        "configured_elections": int(configured_elections),
        "nominations_open": int(nominations_open),
        "finalized_elections": int(finalized_elections),
        "total_elections": int(total_elections),
        "pending_verifications": int(pending_reviews),
        "total_voters": int(total_voters),
        "total_ballots": int(total_ballots),
        "pending_count_runs": int(pending_count_runs),
        "alerts": alerts,
    }
