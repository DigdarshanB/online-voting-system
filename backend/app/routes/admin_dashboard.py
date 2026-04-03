from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.election import Election
from app.models.user import User
from app.models.vote import Vote

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


class DashboardSummaryResponse(BaseModel):
    active_elections: int
    scheduled_elections: int
    registered_voters: int
    pending_verifications: int
    total_votes_cast: int


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin),
) -> DashboardSummaryResponse:
    _ = current_user

    active_elections = db.execute(
        select(func.count()).select_from(Election).where(Election.status == "OPEN")
    ).scalar_one()

    scheduled_elections = db.execute(
        select(func.count()).select_from(Election).where(Election.status == "SCHEDULED")
    ).scalar_one()

    registered_voters = db.execute(
        select(func.count()).select_from(User).where(User.role == "voter")
    ).scalar_one()

    pending_verifications = db.execute(
        select(func.count()).select_from(User).where(
            User.role == "voter",
            User.status == "PENDING_REVIEW",
        )
    ).scalar_one()

    total_votes_cast = db.execute(
        select(func.count()).select_from(Vote)
    ).scalar_one()

    return DashboardSummaryResponse(
        active_elections=int(active_elections or 0),
        scheduled_elections=int(scheduled_elections or 0),
        registered_voters=int(registered_voters or 0),
        pending_verifications=int(pending_verifications or 0),
        total_votes_cast=int(total_votes_cast or 0),
    )
