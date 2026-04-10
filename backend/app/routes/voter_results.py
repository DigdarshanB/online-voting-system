"""Public / voter-facing result endpoints.

Results are visible only when the election has been FINALIZED (or when
result_visible_from has passed).

Endpoints:
  GET  /voter/results/{election_id}/summary   — high-level summary
  GET  /voter/results/{election_id}/fptp      — FPTP constituency results
  GET  /voter/results/{election_id}/pr        — PR seat allocation results
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.count_run import CountRun
from app.models.election import Election
from app.models.user import User
from app.schemas.result import (
    FptpResultRowRead,
    PrElectedMemberRead,
    PrResultRowRead,
    ProvincialResultSummary,
    ResultSummary,
)
from app.services.count_service import (
    CountServiceError,
    enrich_pr_elected_members,
    get_fptp_results,
    get_pr_elected_members,
    get_pr_results,
    get_provincial_result_summary,
    get_result_summary,
    enrich_fptp_results,
    enrich_pr_results,
)

router = APIRouter(prefix="/voter/results", tags=["voter-results"])


def _require_voter(user: User) -> None:
    if user.role != "voter":
        raise HTTPException(status_code=403, detail="Voter access required")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")


def _get_final_count_run(db: Session, election_id: int) -> CountRun:
    """Return the finalized count run for an election, or 404."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status not in ("FINALIZED", "ARCHIVED"):
        raise HTTPException(
            status_code=400,
            detail="Results are not yet available for this election",
        )
    run = db.execute(
        select(CountRun).where(
            CountRun.election_id == election_id,
            CountRun.is_final == True,  # noqa: E712
        )
    ).scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=404,
            detail="No finalized count run found for this election",
        )
    return run


@router.get("/{election_id}/summary", response_model=ResultSummary)
def voter_result_summary(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_voter(current_user)
    run = _get_final_count_run(db, election_id)
    try:
        return get_result_summary(db, run.id)
    except CountServiceError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{election_id}/fptp", response_model=list[FptpResultRowRead])
def voter_fptp_results(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_voter(current_user)
    run = _get_final_count_run(db, election_id)
    rows = get_fptp_results(db, run.id)
    return enrich_fptp_results(db, rows)


@router.get("/{election_id}/pr", response_model=list[PrResultRowRead])
def voter_pr_results(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_voter(current_user)
    run = _get_final_count_run(db, election_id)
    rows = get_pr_results(db, run.id)
    return enrich_pr_results(db, rows)


@router.get(
    "/{election_id}/pr-elected-members",
    response_model=list[PrElectedMemberRead],
)
def voter_pr_elected_members(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """PR elected-member roster (individual candidates who won PR seats)."""
    _require_voter(current_user)
    run = _get_final_count_run(db, election_id)
    members = get_pr_elected_members(db, run.id)
    return enrich_pr_elected_members(db, members)


@router.get(
    "/{election_id}/provincial-summary",
    response_model=ProvincialResultSummary,
)
def voter_provincial_summary(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full provincial assembly result including composition breakdown."""
    _require_voter(current_user)
    run = _get_final_count_run(db, election_id)
    try:
        return get_provincial_result_summary(db, run.id)
    except CountServiceError as e:
        raise HTTPException(status_code=404, detail=str(e))
