"""Admin voter-constituency assignment endpoints.

Endpoints:
  GET    /admin/voter-assignments/{voter_id}     — get voter's current assignment
  POST   /admin/voter-assignments                — assign a voter to a constituency
  DELETE /admin/voter-assignments/{voter_id}      — remove a voter's assignment
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.constituency import Constituency
from app.models.user import User
from app.models.voter_constituency_assignment import VoterConstituencyAssignment

router = APIRouter(prefix="/admin/voter-assignments", tags=["voter-assignments"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class AssignRequest(BaseModel):
    voter_id: int
    constituency_id: int


class AssignmentRead(BaseModel):
    id: int
    voter_id: int
    constituency_id: int
    constituency_name: str | None = None

    class Config:
        from_attributes = True


@router.get("/{voter_id}", response_model=AssignmentRead | None)
def get_assignment(
    voter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    row = db.execute(
        select(VoterConstituencyAssignment).where(
            VoterConstituencyAssignment.voter_id == voter_id
        )
    ).scalar_one_or_none()
    if not row:
        return None
    constituency = db.get(Constituency, row.constituency_id)
    return AssignmentRead(
        id=row.id,
        voter_id=row.voter_id,
        constituency_id=row.constituency_id,
        constituency_name=constituency.name if constituency else None,
    )


@router.post("/", response_model=AssignmentRead, status_code=201)
def assign_voter(
    body: AssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    # Validate voter exists and is a voter
    voter = db.get(User, body.voter_id)
    if not voter or voter.role != "voter":
        raise HTTPException(status_code=404, detail="Voter not found")

    # Validate constituency exists
    constituency = db.get(Constituency, body.constituency_id)
    if not constituency:
        raise HTTPException(status_code=404, detail="Constituency not found")

    # Upsert: remove existing assignment if any
    existing = db.execute(
        select(VoterConstituencyAssignment).where(
            VoterConstituencyAssignment.voter_id == body.voter_id
        )
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.flush()

    assignment = VoterConstituencyAssignment(
        voter_id=body.voter_id,
        constituency_id=body.constituency_id,
    )
    db.add(assignment)
    try:
        db.commit()
        db.refresh(assignment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")

    return AssignmentRead(
        id=assignment.id,
        voter_id=assignment.voter_id,
        constituency_id=assignment.constituency_id,
        constituency_name=constituency.name,
    )


@router.delete("/{voter_id}", status_code=204)
def remove_assignment(
    voter_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    existing = db.execute(
        select(VoterConstituencyAssignment).where(
            VoterConstituencyAssignment.voter_id == voter_id
        )
    ).scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="No assignment found")
    db.delete(existing)
    db.commit()
