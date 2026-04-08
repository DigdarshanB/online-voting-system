from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.services.dashboard_service import (
    get_election_status_distribution,
    get_registration_activity,
)

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


@router.get("/status-distribution", response_model=ElectionStatusDistributionResponse)
def status_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> ElectionStatusDistributionResponse:
    data = get_election_status_distribution(db)
    return ElectionStatusDistributionResponse(**data)


@router.get("/registration-activity", response_model=RegistrationActivityResponse)
def registration_activity(
    time_range: str = Query("6m", alias="range"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> RegistrationActivityResponse:
    data = get_registration_activity(time_range, db)
    return RegistrationActivityResponse(**data)
