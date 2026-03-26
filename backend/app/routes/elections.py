from datetime import datetime, timezone
from typing import Any

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

router = APIRouter(prefix="/admin/elections", tags=["admin-elections"])

VALID_ELECTION_TYPES = {"FEDERAL", "PROVINCIAL", "LOCAL"}
VALID_ELECTION_STATUSES = {"DRAFT", "SCHEDULED", "OPEN", "CLOSED", "ARCHIVED"}
MIN_CANDIDATES_TO_OPEN = 1
IMMUTABLE_AFTER_OPEN = {"title", "election_type", "start_time", "end_time"}


def _utcnow_naive() -> datetime:
    # Existing models store naive datetimes in DB, so use UTC without tzinfo consistently.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _require_admin_or_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def _validate_time_window(start_time: datetime, end_time: datetime) -> None:
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")


def _ensure_status(value: str) -> str:
    normalized = value.strip().upper()
    if normalized not in VALID_ELECTION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid election status")
    return normalized


def _ensure_election_type(value: str) -> str:
    normalized = value.strip().upper()
    if normalized not in VALID_ELECTION_TYPES:
        raise HTTPException(status_code=400, detail="Invalid election_type")
    return normalized


def _get_election_or_404(db: Session, election_id: int) -> Election:
    election = db.execute(
        select(Election).where(Election.id == election_id)
    ).scalar_one_or_none()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


def _count_candidates(db: Session, election_id: int) -> int:
    return int(
        db.execute(
            select(func.count(Candidate.id)).where(Candidate.election_id == election_id)
        ).scalar_one()
        or 0
    )


def _serialize_election(election: Election, candidate_count: int) -> "ElectionResponse":
    return ElectionResponse(
        id=election.id,
        title=election.title,
        description=election.description,
        election_type=election.election_type,
        status=election.status,
        start_time=election.start_time,
        end_time=election.end_time,
        created_by=election.created_by,
        created_at=election.created_at,
        updated_at=election.updated_at,
        result_visible_from=election.result_visible_from,
        candidate_count=candidate_count,
    )


class ElectionCreateRequest(BaseModel):
    title: str
    description: str | None = None
    election_type: str
    status: str = "DRAFT"
    start_time: datetime
    end_time: datetime
    result_visible_from: datetime | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title is required")
        return trimmed

    @field_validator("election_type")
    @classmethod
    def validate_election_type(cls, value: str) -> str:
        return _ensure_election_type(value)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = _ensure_status(value)
        if normalized not in {"DRAFT", "SCHEDULED"}:
            raise ValueError("status must be DRAFT or SCHEDULED when creating an election")
        return normalized


class ElectionUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    election_type: str | None = None
    status: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    result_visible_from: datetime | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return value
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title cannot be empty")
        return trimmed

    @field_validator("election_type")
    @classmethod
    def validate_election_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _ensure_election_type(value)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = _ensure_status(value)
        if normalized not in {"DRAFT", "SCHEDULED"}:
            raise ValueError("status can only be updated to DRAFT or SCHEDULED via PUT")
        return normalized


class ElectionResponse(BaseModel):
    id: int
    title: str
    description: str | None
    election_type: str
    status: str
    start_time: datetime
    end_time: datetime
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    result_visible_from: datetime | None
    candidate_count: int

    class Config:
        from_attributes = True


class ElectionActionResponse(BaseModel):
    detail: str
    election: ElectionResponse


@router.get("", response_model=list[ElectionResponse])
def list_elections(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    election_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin_or_super_admin),
):
    stmt = (
        select(Election, func.count(Candidate.id).label("candidate_count"))
        .outerjoin(Candidate, Candidate.election_id == Election.id)
        .group_by(Election.id)
        .order_by(Election.created_at.desc(), Election.id.desc())
    )

    if q:
        stmt = stmt.where(Election.title.ilike(f"%{q.strip()}%"))
    if status:
        stmt = stmt.where(Election.status == _ensure_status(status))
    if election_type:
        stmt = stmt.where(Election.election_type == _ensure_election_type(election_type))

    rows = db.execute(stmt).all()
    return [_serialize_election(election, int(candidate_count or 0)) for election, candidate_count in rows]


@router.post("", response_model=ElectionResponse, status_code=201)
def create_election(
    payload: ElectionCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    _validate_time_window(payload.start_time, payload.end_time)

    election = Election(
        title=payload.title,
        description=payload.description,
        election_type=payload.election_type,
        status=payload.status,
        start_time=payload.start_time,
        end_time=payload.end_time,
        result_visible_from=payload.result_visible_from,
        created_by=current_user.id,
    )
    db.add(election)
    db.commit()
    db.refresh(election)

    audit_auth_event(
        action="election_created",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={
            "election_id": election.id,
            "title": election.title,
            "status": election.status,
        },
    )

    return _serialize_election(election, candidate_count=0)


@router.get("/{election_id}", response_model=ElectionResponse)
def get_election(
    election_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)
    return _serialize_election(election, candidate_count=_count_candidates(db, election.id))


@router.put("/{election_id}", response_model=ElectionResponse)
def update_election(
    election_id: int,
    payload: ElectionUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)
    changes = payload.model_dump(exclude_unset=True)

    if not changes:
        return _serialize_election(election, candidate_count=_count_candidates(db, election.id))

    if election.status in {"OPEN", "CLOSED", "ARCHIVED"}:
        immutable_updates = IMMUTABLE_AFTER_OPEN.intersection(changes.keys())
        if immutable_updates:
            raise HTTPException(
                status_code=400,
                detail="Cannot modify critical election fields after election is OPEN",
            )

    if "status" in changes and election.status in {"OPEN", "CLOSED", "ARCHIVED"}:
        raise HTTPException(status_code=400, detail="Use lifecycle endpoints for status transitions")

    start_time = changes.get("start_time", election.start_time)
    end_time = changes.get("end_time", election.end_time)
    _validate_time_window(start_time, end_time)

    for field, value in changes.items():
        setattr(election, field, value)

    db.add(election)
    db.commit()
    db.refresh(election)

    audit_auth_event(
        action="election_updated",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={
            "election_id": election.id,
            "changed_fields": sorted(changes.keys()),
            "status": election.status,
        },
    )

    return _serialize_election(election, candidate_count=_count_candidates(db, election.id))


@router.delete("/{election_id}")
def delete_election(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)
    candidate_count = _count_candidates(db, election.id)

    if election.status != "DRAFT":
        raise HTTPException(status_code=400, detail="Only DRAFT elections can be deleted")
    if candidate_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete election with assigned candidates")

    deleted_metadata: dict[str, Any] = {
        "election_id": election.id,
        "title": election.title,
        "status": election.status,
    }

    db.delete(election)
    db.commit()

    audit_auth_event(
        action="election_deleted",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata=deleted_metadata,
    )

    return {"detail": "Election deleted successfully"}


@router.post("/{election_id}/open", response_model=ElectionActionResponse)
def open_election(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)
    if election.status not in {"DRAFT", "SCHEDULED"}:
        raise HTTPException(status_code=400, detail="Only DRAFT or SCHEDULED elections can be opened")

    _validate_time_window(election.start_time, election.end_time)
    candidate_count = _count_candidates(db, election.id)
    if candidate_count < MIN_CANDIDATES_TO_OPEN:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot open election with fewer than {MIN_CANDIDATES_TO_OPEN} candidate(s)",
        )

    now = _utcnow_naive()
    if election.end_time <= now:
        raise HTTPException(status_code=400, detail="Cannot open election that has already ended")

    election.status = "OPEN"
    if election.start_time > now:
        election.start_time = now

    db.add(election)
    db.commit()
    db.refresh(election)

    audit_auth_event(
        action="election_opened",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={"election_id": election.id, "candidate_count": candidate_count},
    )

    return ElectionActionResponse(
        detail="Election opened successfully",
        election=_serialize_election(election, candidate_count=candidate_count),
    )


@router.post("/{election_id}/close", response_model=ElectionActionResponse)
def close_election(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)
    if election.status != "OPEN":
        raise HTTPException(status_code=400, detail="Only OPEN elections can be closed")

    now = _utcnow_naive()
    election.status = "CLOSED"
    if election.end_time > now:
        election.end_time = now

    db.add(election)
    db.commit()
    db.refresh(election)

    candidate_count = _count_candidates(db, election.id)
    audit_auth_event(
        action="election_closed",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={"election_id": election.id},
    )

    return ElectionActionResponse(
        detail="Election closed successfully",
        election=_serialize_election(election, candidate_count=candidate_count),
    )


@router.post("/{election_id}/archive", response_model=ElectionActionResponse)
def archive_election(
    election_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(_require_admin_or_super_admin),
):
    election = _get_election_or_404(db, election_id)
    if election.status != "CLOSED":
        raise HTTPException(status_code=400, detail="Only CLOSED elections can be archived")

    election.status = "ARCHIVED"
    db.add(election)
    db.commit()
    db.refresh(election)

    candidate_count = _count_candidates(db, election.id)
    audit_auth_event(
        action="election_archived",
        actor_user_id=current_user.id,
        outcome="SUCCESS",
        request=request,
        metadata={"election_id": election.id},
    )

    return ElectionActionResponse(
        detail="Election archived successfully",
        election=_serialize_election(election, candidate_count=candidate_count),
    )
