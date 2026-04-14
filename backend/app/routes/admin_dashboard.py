from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.services.dashboard_service import (
    get_dashboard_summary,
    get_scheduled_elections_list,
    get_system_status,
)

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


class DashboardSummaryResponse(BaseModel):
    active_elections: int
    scheduled_elections: int
    registered_voters: int
    pending_verifications: int
    total_votes_cast: int


class ScheduledElectionItem(BaseModel):
    id: int
    title: str
    status: str
    government_level: str
    election_subtype: str
    start_time: str | None
    end_time: str | None
    polling_start_at: str | None
    polling_end_at: str | None
    province_code: str | None


class ScheduledElectionsResponse(BaseModel):
    items: list[ScheduledElectionItem]


class SystemStatusAlert(BaseModel):
    type: str
    message: str


class SystemStatusResponse(BaseModel):
    overall: str
    active_elections: int
    counting_elections: int
    configured_elections: int
    nominations_open: int
    finalized_elections: int
    total_elections: int
    pending_verifications: int
    total_voters: int
    total_ballots: int
    pending_count_runs: int
    alerts: list[SystemStatusAlert]


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> DashboardSummaryResponse:
    data = get_dashboard_summary(db)
    return DashboardSummaryResponse(**data)


@router.get("/scheduled-elections", response_model=ScheduledElectionsResponse)
def scheduled_elections(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> ScheduledElectionsResponse:
    items = get_scheduled_elections_list(db)
    return ScheduledElectionsResponse(items=items)


@router.get("/system-status", response_model=SystemStatusResponse)
def system_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> SystemStatusResponse:
    data = get_system_status(db)
    return SystemStatusResponse(**data)
