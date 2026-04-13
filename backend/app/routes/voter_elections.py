from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
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
from app.services.vote_identity_service import (
    start_face_session,
    verify_and_cast_dual,
    verify_and_cast_local,
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
    """Federal / Provincial dual-ballot (FPTP + PR). All fields optional for undervote."""
    fptp_nomination_id: Optional[int] = None
    pr_party_id: Optional[int] = None


class CastLocalBallotRequest(BaseModel):
    """Local ballot — up to 7 selections across 6 contests. All optional for undervote."""
    head_nomination_id: Optional[int] = None
    deputy_head_nomination_id: Optional[int] = None
    ward_chair_nomination_id: Optional[int] = None
    ward_woman_member_nomination_id: Optional[int] = None
    ward_dalit_woman_member_nomination_id: Optional[int] = None
    ward_member_open_nomination_ids: list[int] = []


class VerifyAndCastRequest(BaseModel):
    """Federal / Provincial dual-ballot with face verification token."""
    verification_context_token: str
    captured_frame: str
    fptp_nomination_id: Optional[int] = None
    pr_party_id: Optional[int] = None


class VerifyAndCastLocalRequest(BaseModel):
    """Local ballot with face verification token."""
    verification_context_token: str
    captured_frame: str
    head_nomination_id: Optional[int] = None
    deputy_head_nomination_id: Optional[int] = None
    ward_chair_nomination_id: Optional[int] = None
    ward_woman_member_nomination_id: Optional[int] = None
    ward_dalit_woman_member_nomination_id: Optional[int] = None
    ward_member_open_nomination_ids: list[int] = []


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


# ── Pre-cast face verification endpoints ────────────────────────


@router.post("/{election_id}/face-session/start")
def face_session_start(
    election_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a face liveness verification session for pre-cast identity check."""
    _require_active_voter(current_user)
    return start_face_session(db, current_user, election_id, request)


@router.post("/{election_id}/verify-and-cast")
def verify_and_cast(
    election_id: int,
    payload: VerifyAndCastRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify voter face then cast federal/provincial dual ballot atomically."""
    _require_active_voter(current_user)
    return verify_and_cast_dual(
        db,
        election_id=election_id,
        voter=current_user,
        verification_context_token=payload.verification_context_token,
        captured_frame_base64=payload.captured_frame,
        fptp_nomination_id=payload.fptp_nomination_id,
        pr_party_id=payload.pr_party_id,
        request=request,
    )


@router.post("/{election_id}/verify-and-cast-local")
def verify_and_cast_local_ballot(
    election_id: int,
    payload: VerifyAndCastLocalRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify voter face then cast local ballot atomically."""
    _require_active_voter(current_user)
    selections = payload.model_dump(exclude={"verification_context_token", "captured_frame"})
    return verify_and_cast_local(
        db,
        election_id=election_id,
        voter=current_user,
        verification_context_token=payload.verification_context_token,
        captured_frame_base64=payload.captured_frame,
        selections=selections,
        request=request,
    )
