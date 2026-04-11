from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.services.ballot_service import (
    cast_dual_ballot_dispatch,
    cast_local_ballot_dispatch,
    get_ballot_info_dispatch,
    get_eligible_nominations_by_family,
    list_voter_elections,
)

router = APIRouter(prefix="/voter/elections", tags=["voter-elections"])


# ── helpers ──────────────────────────────────────────────────────


def _require_active_voter(user: User) -> None:
    if user.role != "voter":
        raise HTTPException(status_code=403, detail="Voter access required")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")


# ── DTOs ─────────────────────────────────────────────────────────


class CastBallotRequest(BaseModel):
    """Federal / Provincial dual-ballot (FPTP + PR)."""
    fptp_nomination_id: int
    pr_party_id: int


class CastLocalBallotRequest(BaseModel):
    """Local ballot — 7 selections across 6 contests."""
    head_nomination_id: int
    deputy_head_nomination_id: int
    ward_chair_nomination_id: int
    ward_woman_member_nomination_id: int
    ward_dalit_woman_member_nomination_id: int
    ward_member_open_nomination_ids: list[int]


# ── endpoints ────────────────────────────────────────────────────


@router.get("/")
def get_elections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return list_voter_elections(db, current_user)


@router.get("/candidates/{family}")
def get_candidates_by_family(
    family: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return nominated candidates the voter is eligible to see for a given
    election family (FEDERAL / PROVINCIAL / LOCAL)."""
    _require_active_voter(current_user)
    return get_eligible_nominations_by_family(db, current_user, family.upper())


@router.get("/{election_id}/ballot")
def get_ballot(
    election_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return get_ballot_info_dispatch(db, election_id, current_user)


@router.post("/{election_id}/cast")
def cast_ballot(
    election_id: int,
    payload: CastBallotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return cast_dual_ballot_dispatch(
        db,
        election_id=election_id,
        voter=current_user,
        fptp_nomination_id=payload.fptp_nomination_id,
        pr_party_id=payload.pr_party_id,
    )


@router.post("/{election_id}/cast-local")
def cast_local_ballot(
    election_id: int,
    payload: CastLocalBallotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return cast_local_ballot_dispatch(
        db,
        election_id=election_id,
        voter=current_user,
        selections=payload.model_dump(),
    )
