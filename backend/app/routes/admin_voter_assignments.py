"""Admin voter-constituency assignment endpoints.

Endpoints:
  GET    /admin/voter-assignments                — list all assignments (paginated)
  GET    /admin/voter-assignments/constituencies  — list all constituencies (for dropdown)
  GET    /admin/voter-assignments/voters          — list assignable voters (active, role=voter)
  GET    /admin/voter-assignments/{voter_id}      — get voter's current assignment
  POST   /admin/voter-assignments                 — assign a voter to a constituency
  DELETE /admin/voter-assignments/{voter_id}       — remove a voter's assignment
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.constituency import Constituency
from app.models.district import District
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
    voter_name: str | None = None
    citizenship_no: str | None = None

    class Config:
        from_attributes = True


# ── List all assignments ────────────────────────────────────────


@router.get("/constituencies")
def list_constituencies(
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    """List all constituencies with district info for dropdowns."""
    rows = db.execute(
        select(
            Constituency.id,
            Constituency.name,
            Constituency.code,
            District.name.label("district_name"),
            District.province_number.label("province_id"),
        )
        .join(District, Constituency.district_id == District.id)
        .order_by(District.province_number, District.name, Constituency.name)
    ).all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "district_name": r.district_name,
            "province_id": r.province_id,
        }
        for r in rows
    ]


@router.get("/voters")
def list_assignable_voters(
    search: str = Query(default="", max_length=100),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    """Search voters by citizenship ID (normalized). Returns voter card data."""
    q = select(
        User.id,
        User.full_name,
        User.citizenship_no_raw,
        User.citizenship_no_normalized,
        User.status,
    ).where(User.role == "voter")

    if search.strip():
        q = q.where(User.citizenship_no_normalized.like(f"%{search.strip()}%"))
    else:
        # Require a search term — don't dump all voters
        return []

    q = q.order_by(User.citizenship_no_normalized).limit(50)
    rows = db.execute(q).all()

    # Also fetch existing assignments so UI can show who's already assigned
    assigned_ids = [r.id for r in rows]
    assigned_map = {}
    if assigned_ids:
        assigned_map = dict(
            db.execute(
                select(
                    VoterConstituencyAssignment.voter_id,
                    Constituency.name,
                )
                .join(
                    Constituency,
                    VoterConstituencyAssignment.constituency_id == Constituency.id,
                )
                .where(VoterConstituencyAssignment.voter_id.in_(assigned_ids))
            ).all()
        )

    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "citizenship_no_raw": r.citizenship_no_raw,
            "citizenship_no_normalized": r.citizenship_no_normalized,
            "status": r.status,
            "assigned_constituency": assigned_map.get(r.id),
        }
        for r in rows
    ]


@router.get("/", response_model=list[AssignmentRead])
def list_assignments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    """List all voter-constituency assignments with voter/constituency names."""
    offset = (page - 1) * page_size
    rows = db.execute(
        select(
            VoterConstituencyAssignment.id,
            VoterConstituencyAssignment.voter_id,
            VoterConstituencyAssignment.constituency_id,
            User.full_name.label("voter_name"),
            User.citizenship_no_normalized.label("citizenship_no"),
            Constituency.name.label("constituency_name"),
        )
        .join(User, VoterConstituencyAssignment.voter_id == User.id)
        .join(
            Constituency,
            VoterConstituencyAssignment.constituency_id == Constituency.id,
        )
        .order_by(User.full_name)
        .offset(offset)
        .limit(page_size)
    ).all()
    return [
        AssignmentRead(
            id=r.id,
            voter_id=r.voter_id,
            constituency_id=r.constituency_id,
            constituency_name=r.constituency_name,
            voter_name=r.voter_name,
            citizenship_no=r.citizenship_no,
        )
        for r in rows
    ]


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
    voter = db.get(User, row.voter_id)
    return AssignmentRead(
        id=row.id,
        voter_id=row.voter_id,
        constituency_id=row.constituency_id,
        constituency_name=constituency.name if constituency else None,
        voter_name=voter.full_name if voter else None,
        citizenship_no=voter.citizenship_no_normalized if voter else None,
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
        voter_name=voter.full_name,
        citizenship_no=voter.citizenship_no_normalized,
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
