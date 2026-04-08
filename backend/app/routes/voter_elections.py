from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.services.ballot_service import (
    cast_dual_ballot,
    get_ballot_info,
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
    fptp_nomination_id: int
    pr_party_id: int


# ── endpoints ────────────────────────────────────────────────────


@router.get("/")
def get_elections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return list_voter_elections(db, current_user)


@router.get("/{election_id}/ballot")
def get_ballot(
    election_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return get_ballot_info(db, election_id, current_user)


@router.post("/{election_id}/cast")
def cast_ballot(
    election_id: int,
    payload: CastBallotRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_active_voter(current_user)
    return cast_dual_ballot(
        db,
        election_id=election_id,
        voter=current_user,
        fptp_nomination_id=payload.fptp_nomination_id,
        pr_party_id=payload.pr_party_id,
    )
