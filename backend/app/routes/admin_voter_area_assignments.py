"""Admin voter-area-assignment endpoints (provincial / local).

Endpoints:
  GET    /admin/voter-area-assignments                  — list assignments (paginated, filterable by level)
  GET    /admin/voter-area-assignments/areas             — list area_units for dropdown (filter by government_level)
  GET    /admin/voter-area-assignments/voters            — search voters for assignment
  GET    /admin/voter-area-assignments/{voter_id}        — get a voter's area assignment for a given level
  POST   /admin/voter-area-assignments                   — assign a voter to an area for a level
  DELETE /admin/voter-area-assignments/{voter_id}        — remove a voter's assignment for a given level
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.area_unit import AreaUnit
from app.models.user import User
from app.models.voter_area_assignment import VoterAreaAssignment

router = APIRouter(
    prefix="/admin/voter-area-assignments", tags=["voter-area-assignments"]
)

VALID_LEVELS = ("PROVINCIAL", "LOCAL")

# Maps government_level to allowed AreaUnit categories for assignment.
# Provincial voters are assigned to a CONSTITUENCY area_unit within their province.
# Local voters are assigned to a WARD area_unit.
# The ward determines ward-level contests; its parent local body determines
# the head/deputy contests (Mayor/Deputy or Chairperson/Vice Chairperson).
_LEVEL_CATEGORIES: dict[str, tuple[str, ...]] = {
    "PROVINCIAL": ("CONSTITUENCY",),
    "LOCAL": ("WARD",),
}


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── DTOs ─────────────────────────────────────────────────────────


class AreaAssignRequest(BaseModel):
    voter_id: int
    area_id: int
    government_level: str  # "PROVINCIAL" or "LOCAL"


class AreaAssignmentRead(BaseModel):
    id: int
    voter_id: int
    area_id: int
    government_level: str
    area_name: str | None = None
    area_code: str | None = None
    province_number: int | None = None
    voter_name: str | None = None
    citizenship_no: str | None = None

    class Config:
        from_attributes = True


# ── List areas (dropdown) ───────────────────────────────────────


@router.get("/areas")
def list_areas(
    government_level: str = Query(..., description="PROVINCIAL or LOCAL"),
    province_number: int | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    """List area_units valid for assignment at the given government level."""
    if government_level not in VALID_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"government_level must be one of {VALID_LEVELS}",
        )
    categories = _LEVEL_CATEGORIES[government_level]
    q = (
        select(AreaUnit.id, AreaUnit.code, AreaUnit.name, AreaUnit.province_number)
        .where(AreaUnit.category.in_(categories))
        .order_by(AreaUnit.province_number, AreaUnit.name)
    )
    if province_number is not None:
        q = q.where(AreaUnit.province_number == province_number)
    rows = db.execute(q).all()
    return [
        {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "province_number": r.province_number,
        }
        for r in rows
    ]


# ── Search voters for assignment ────────────────────────────────


@router.get("/voters")
def list_assignable_voters(
    search: str = Query(default="", max_length=100),
    government_level: str = Query(default="PROVINCIAL"),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    """Search voters by citizenship ID. Shows existing area assignment for the level."""
    if government_level not in VALID_LEVELS:
        raise HTTPException(status_code=400, detail=f"government_level must be one of {VALID_LEVELS}")

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
        return []

    q = q.order_by(User.citizenship_no_normalized).limit(50)
    rows = db.execute(q).all()

    # Fetch existing area assignments for these voters at this level
    voter_ids = [r.id for r in rows]
    assigned_map: dict[int, str] = {}
    if voter_ids:
        assigned_rows = db.execute(
            select(
                VoterAreaAssignment.voter_id,
                AreaUnit.name,
            )
            .join(AreaUnit, VoterAreaAssignment.area_id == AreaUnit.id)
            .where(
                VoterAreaAssignment.voter_id.in_(voter_ids),
                VoterAreaAssignment.government_level == government_level,
            )
        ).all()
        assigned_map = dict(assigned_rows)

    return [
        {
            "id": r.id,
            "full_name": r.full_name,
            "citizenship_no_raw": r.citizenship_no_raw,
            "citizenship_no_normalized": r.citizenship_no_normalized,
            "status": r.status,
            "assigned_area": assigned_map.get(r.id),
        }
        for r in rows
    ]


# ── List all assignments ────────────────────────────────────────


@router.get("/", response_model=list[AreaAssignmentRead])
def list_assignments(
    government_level: str = Query(default="PROVINCIAL"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    offset = (page - 1) * page_size
    rows = db.execute(
        select(
            VoterAreaAssignment.id,
            VoterAreaAssignment.voter_id,
            VoterAreaAssignment.area_id,
            VoterAreaAssignment.government_level,
            AreaUnit.name.label("area_name"),
            AreaUnit.code.label("area_code"),
            AreaUnit.province_number,
            User.full_name.label("voter_name"),
            User.citizenship_no_normalized.label("citizenship_no"),
        )
        .join(AreaUnit, VoterAreaAssignment.area_id == AreaUnit.id)
        .join(User, VoterAreaAssignment.voter_id == User.id)
        .where(VoterAreaAssignment.government_level == government_level)
        .order_by(User.full_name)
        .offset(offset)
        .limit(page_size)
    ).all()
    return [
        AreaAssignmentRead(
            id=r.id,
            voter_id=r.voter_id,
            area_id=r.area_id,
            government_level=r.government_level,
            area_name=r.area_name,
            area_code=r.area_code,
            province_number=r.province_number,
            voter_name=r.voter_name,
            citizenship_no=r.citizenship_no,
        )
        for r in rows
    ]


# ── Get single voter's assignment ───────────────────────────────


@router.get("/{voter_id}", response_model=AreaAssignmentRead | None)
def get_assignment(
    voter_id: int,
    government_level: str = Query(default="PROVINCIAL"),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    row = db.execute(
        select(VoterAreaAssignment).where(
            VoterAreaAssignment.voter_id == voter_id,
            VoterAreaAssignment.government_level == government_level,
        )
    ).scalar_one_or_none()
    if not row:
        return None
    area = db.get(AreaUnit, row.area_id)
    voter = db.get(User, row.voter_id)
    return AreaAssignmentRead(
        id=row.id,
        voter_id=row.voter_id,
        area_id=row.area_id,
        government_level=row.government_level,
        area_name=area.name if area else None,
        area_code=area.code if area else None,
        province_number=area.province_number if area else None,
        voter_name=voter.full_name if voter else None,
        citizenship_no=voter.citizenship_no_normalized if voter else None,
    )


# ── Assign voter to area ────────────────────────────────────────


@router.post("/", response_model=AreaAssignmentRead, status_code=201)
def assign_voter(
    body: AreaAssignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    if body.government_level not in VALID_LEVELS:
        raise HTTPException(
            status_code=400,
            detail=f"government_level must be one of {VALID_LEVELS}",
        )

    # Validate voter exists and is a voter
    voter = db.get(User, body.voter_id)
    if not voter or voter.role != "voter":
        raise HTTPException(status_code=404, detail="Voter not found")

    # Validate area_unit exists and matches the level
    area = db.get(AreaUnit, body.area_id)
    if not area:
        raise HTTPException(status_code=404, detail="Area unit not found")
    allowed_cats = _LEVEL_CATEGORIES[body.government_level]
    if area.category not in allowed_cats:
        raise HTTPException(
            status_code=400,
            detail=f"Area category '{area.category}' is not valid for {body.government_level}. Expected one of {allowed_cats}",
        )

    # Upsert: remove existing assignment for this level if any
    existing = db.execute(
        select(VoterAreaAssignment).where(
            VoterAreaAssignment.voter_id == body.voter_id,
            VoterAreaAssignment.government_level == body.government_level,
        )
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.flush()

    assignment = VoterAreaAssignment(
        voter_id=body.voter_id,
        area_id=body.area_id,
        government_level=body.government_level,
        assigned_by=user.id,
    )
    db.add(assignment)
    try:
        db.commit()
        db.refresh(assignment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Assignment conflict")

    return AreaAssignmentRead(
        id=assignment.id,
        voter_id=assignment.voter_id,
        area_id=assignment.area_id,
        government_level=assignment.government_level,
        area_name=area.name,
        area_code=area.code,
        province_number=area.province_number,
        voter_name=voter.full_name,
        citizenship_no=voter.citizenship_no_normalized,
    )


# ── Remove assignment ───────────────────────────────────────────


@router.delete("/{voter_id}", status_code=204)
def remove_assignment(
    voter_id: int,
    government_level: str = Query(default="PROVINCIAL"),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    existing = db.execute(
        select(VoterAreaAssignment).where(
            VoterAreaAssignment.voter_id == voter_id,
            VoterAreaAssignment.government_level == government_level,
        )
    ).scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="No assignment found")
    db.delete(existing)
    db.commit()
