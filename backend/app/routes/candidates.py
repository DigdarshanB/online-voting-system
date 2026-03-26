from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.candidate import Candidate
from app.models.election import Election
from app.models.user import User
from app.services.auth_audit import audit_auth_event

router = APIRouter(prefix="/admin", tags=["admin-candidates"])

CANDIDATE_MUTABLE_ELECTION_STATUSES = {"DRAFT", "SCHEDULED"}
CANDIDATE_LOCKED_ELECTION_STATUSES = {"OPEN", "CLOSED", "ARCHIVED"}


def _require_admin_or_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _get_election_or_404(db: Session, election_id: int) -> Election:
    election = db.execute(
        select(Election).where(Election.id == election_id)
    ).scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


def _get_candidate_or_404(db: Session, candidate_id: int) -> Candidate:
    candidate = db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    ).scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


def _normalize_required_name(value: str, field_name: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail=f"{field_name} is required")
    return normalized


def _ensure_election_allows_candidate_changes(election: Election) -> None:
    if election.status in CANDIDATE_LOCKED_ELECTION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Candidate changes are not allowed when election is OPEN, CLOSED, or ARCHIVED",
        )


def _ensure_no_duplicate_candidate_name(
    db: Session,
    election_id: int,
    candidate_name: str,
    exclude_candidate_id: int | None = None,
) -> None:
    stmt = select(Candidate).where(
        Candidate.election_id == election_id,
        func.lower(Candidate.name) == candidate_name.lower(),
    )
    if exclude_candidate_id is not None:
        stmt = stmt.where(Candidate.id != exclude_candidate_id)

    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Candidate with the same name already exists in this election",
        )


class ElectionSummaryResponse(BaseModel):
    id: int
    title: str
    election_type: str
    status: str
    start_time: datetime
    end_time: datetime

    class Config:
        from_attributes = True


class CandidateCreateRequest(BaseModel):
    election_id: int
    name: str
    party: str
    description: str | None = None
    photo_path: str | None = None
    symbol_path: str | None = None
    display_order: int = 0
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name is required")
        return trimmed

    @field_validator("party")
    @classmethod
    def validate_party(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("party is required")
        return trimmed

    @field_validator("display_order")
    @classmethod
    def validate_display_order(cls, value: int) -> int:
        if value < 0:
            raise ValueError("display_order must be 0 or greater")
        return value


class CandidateUpdateRequest(BaseModel):
    election_id: int | None = None
    name: str | None = None
    party: str | None = None
    description: str | None = None
    photo_path: str | None = None
    symbol_path: str | None = None
    display_order: int | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("name cannot be empty")
        return trimmed

    @field_validator("party")
    @classmethod
    def validate_party(cls, value: str | None) -> str | None:
        if value is None:
            return value
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("party cannot be empty")
        return trimmed

    @field_validator("display_order")
    @classmethod
    def validate_display_order(cls, value: int | None) -> int | None:
        if value is None:
            return value
        if value < 0:
            raise ValueError("display_order must be 0 or greater")
        return value


class CandidateResponse(BaseModel):
    id: int
    election_id: int
    name: str
    party: str
    description: str | None
    photo_path: str | None
    symbol_path: str | None
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    election: ElectionSummaryResponse


class CandidateDeleteResponse(BaseModel):
    detail: str


def _serialize_candidate(candidate: Candidate, election: Election) -> CandidateResponse:
    return CandidateResponse(
        id=candidate.id,
        election_id=candidate.election_id,
        name=candidate.name,
        party=candidate.party,
        description=candidate.description,
        photo_path=candidate.photo_path,
        symbol_path=candidate.symbol_path,
        display_order=candidate.display_order,
        is_active=candidate.is_active,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        election=ElectionSummaryResponse(
            id=election.id,
            title=election.title,
            election_type=election.election_type,
            status=election.status,
            start_time=election.start_time,
            end_time=election.end_time,
        ),
    )


@router.get("/candidates", response_model=list[CandidateResponse])
def list_candidates(
    election_id: int | None = Query(default=None),
    q: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin_or_super_admin),
):
    stmt = (
        select(Candidate, Election)
        .join(Election, Election.id == Candidate.election_id)
        .order_by(Candidate.election_id.asc(), Candidate.display_order.asc(), Candidate.id.asc())
    )

    if election_id is not None:
        stmt = stmt.where(Candidate.election_id == election_id)
    if q:
        stmt = stmt.where(Candidate.name.ilike(f"%{q.strip()}%"))
    if is_active is not None:
        stmt = stmt.where(Candidate.is_active == is_active)

    rows = db.execute(stmt).all()
    return [_serialize_candidate(candidate, election) for candidate, election in rows]


@router.post("/candidates", response_model=CandidateResponse, status_code=201)
def create_candidate(
    payload: CandidateCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, payload.election_id)
    _ensure_election_allows_candidate_changes(election)

    candidate_name = _normalize_required_name(payload.name, "name")
    party_name = _normalize_required_name(payload.party, "party")
    _ensure_no_duplicate_candidate_name(db, payload.election_id, candidate_name)

    candidate = Candidate(
        election_id=payload.election_id,
        name=candidate_name,
        party=party_name,
        description=payload.description,
        photo_path=payload.photo_path,
        symbol_path=payload.symbol_path,
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    audit_auth_event(
        action="candidate_created",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={
            "candidate_id": candidate.id,
            "election_id": candidate.election_id,
            "name": candidate.name,
        },
    )

    return _serialize_candidate(candidate, election)


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin_or_super_admin),
):
    row = db.execute(
        select(Candidate, Election)
        .join(Election, Election.id == Candidate.election_id)
        .where(Candidate.id == candidate_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate, election = row
    return _serialize_candidate(candidate, election)


@router.put("/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    payload: CandidateUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    candidate = _get_candidate_or_404(db, candidate_id)
    current_election = _get_election_or_404(db, candidate.election_id)
    _ensure_election_allows_candidate_changes(current_election)

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return _serialize_candidate(candidate, current_election)

    target_election = current_election
    if "election_id" in changes and changes["election_id"] != candidate.election_id:
        target_election = _get_election_or_404(db, int(changes["election_id"]))
        _ensure_election_allows_candidate_changes(target_election)

    if "name" in changes:
        changes["name"] = _normalize_required_name(changes["name"], "name")
    if "party" in changes:
        changes["party"] = _normalize_required_name(changes["party"], "party")

    target_name = changes.get("name", candidate.name)
    _ensure_no_duplicate_candidate_name(
        db,
        int(changes.get("election_id", candidate.election_id)),
        target_name,
        exclude_candidate_id=candidate.id,
    )

    for field, value in changes.items():
        setattr(candidate, field, value)

    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    audit_auth_event(
        action="candidate_updated",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={
            "candidate_id": candidate.id,
            "election_id": candidate.election_id,
            "changed_fields": sorted(changes.keys()),
        },
    )

    response_election = target_election if candidate.election_id == target_election.id else _get_election_or_404(db, candidate.election_id)
    return _serialize_candidate(candidate, response_election)


@router.delete("/candidates/{candidate_id}", response_model=CandidateDeleteResponse)
def delete_candidate(
    candidate_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    candidate = _get_candidate_or_404(db, candidate_id)
    election = _get_election_or_404(db, candidate.election_id)
    _ensure_election_allows_candidate_changes(election)

    deleted_metadata = {
        "candidate_id": candidate.id,
        "election_id": candidate.election_id,
        "name": candidate.name,
    }

    db.delete(candidate)
    db.commit()

    audit_auth_event(
        action="candidate_deleted",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata=deleted_metadata,
    )

    return CandidateDeleteResponse(detail="Candidate deleted successfully")


@router.get("/elections/{election_id}/candidates", response_model=list[CandidateResponse])
def list_candidates_for_election(
    election_id: int,
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)

    stmt = (
        select(Candidate)
        .where(Candidate.election_id == election_id)
        .order_by(Candidate.display_order.asc(), Candidate.id.asc())
    )
    if is_active is not None:
        stmt = stmt.where(Candidate.is_active == is_active)

    rows = db.execute(stmt).scalars().all()
    return [_serialize_candidate(candidate, election) for candidate in rows]
