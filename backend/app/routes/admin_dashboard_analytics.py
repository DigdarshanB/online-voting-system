from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.election import Election
from app.models.user import User

router = APIRouter(prefix="/admin/dashboard/analytics", tags=["admin-dashboard-analytics"])


class ElectionStatusDistributionItem(BaseModel):
    status: str
    label: str
    value: int
    color: str


class ElectionStatusDistributionResponse(BaseModel):
    items: list[ElectionStatusDistributionItem]
    total: int


class RegistrationActivityPoint(BaseModel):
    month_key: str
    month_label: str
    count: int


class RegistrationActivityResponse(BaseModel):
    range: str
    items: list[RegistrationActivityPoint]
    total: int


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _shift_months(month_start: datetime, months: int) -> datetime:
    total_months = month_start.year * 12 + (month_start.month - 1) + months
    year = total_months // 12
    month = (total_months % 12) + 1
    return month_start.replace(year=year, month=month)


@router.get("/status-distribution", response_model=ElectionStatusDistributionResponse)
def get_status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> ElectionStatusDistributionResponse:
    _ = current_user

    rows = db.execute(
        select(Election.status, func.count(Election.id)).group_by(Election.status)
    ).all()

    counts = {
        (str(status).upper() if status is not None else ""): int(count or 0)
        for status, count in rows
    }

    status_meta = [
        ("DRAFT", "Draft", "#94A3B8"),
        ("SCHEDULED", "Scheduled", "#3B82F6"),
        ("OPEN", "Open", "#16A34A"),
        ("CLOSED", "Closed", "#F59E0B"),
    ]

    items = [
        ElectionStatusDistributionItem(
            status=status,
            label=label,
            value=counts.get(status, 0),
            color=color,
        )
        for status, label, color in status_meta
    ]

    total = sum(item.value for item in items)

    return ElectionStatusDistributionResponse(items=items, total=total)


@router.get("/registration-activity", response_model=RegistrationActivityResponse)
def get_registration_activity(
    time_range: str = Query("6m", alias="range"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> RegistrationActivityResponse:
    _ = current_user

    range_to_months = {
        "30d": 1,
        "90d": 3,
        "6m": 6,
        "12m": 12,
    }

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

    items: list[RegistrationActivityPoint] = []
    for idx in range(months_count):
        month_dt = _shift_months(start_month, idx)
        month_key = month_dt.strftime("%Y-%m")
        items.append(
            RegistrationActivityPoint(
                month_key=month_key,
                month_label=month_dt.strftime("%b"),
                count=counts_by_month.get(month_key, 0),
            )
        )

    total = sum(point.count for point in items)

    return RegistrationActivityResponse(range=time_range, items=items, total=total)
