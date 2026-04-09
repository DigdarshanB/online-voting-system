"""Admin election management routes.

Endpoints:
  GET    /admin/elections              — list elections
  POST   /admin/elections              — create draft election
  GET    /admin/elections/{id}         — get election detail
  PATCH  /admin/elections/{id}         — update draft election
  DELETE /admin/elections/{id}         — delete draft election
  POST   /admin/elections/{id}/generate-structure  — generate FPTP + PR contests
  GET    /admin/elections/{id}/contests            — list contests
  GET    /admin/elections/{id}/readiness           — structure readiness check
  POST   /admin/elections/{id}/configure           — lock setup (DRAFT→CONFIGURED)
  GET    /admin/elections/master-data/status        — constituency/district counts
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.repositories import election_repository
from app.schemas.election import (
    ContestRead,
    ElectionCreate,
    ElectionRead,
    ElectionSummary,
    ElectionUpdate,
    ReadinessCheck,
    StructureGenerationResult,
)
from app.services.election_service import (
    ElectionServiceError,
    check_structure_readiness,
    configure_election,
    create_election,
    delete_election,
    generate_election_structure,
    get_master_data_status,
    update_election,
)

router = APIRouter(prefix="/admin/elections", tags=["elections"])


# ── Auth guard ──────────────────────────────────────────────────

def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── List / detail ───────────────────────────────────────────────

@router.get("/", response_model=list[ElectionSummary])
def list_elections(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    elections = election_repository.list_all(db, limit=limit, offset=offset)
    result = []
    for e in elections:
        counts = election_repository.count_contests(db, e.id)
        result.append(
            ElectionSummary(
                id=e.id,
                title=e.title,
                status=e.status,
                government_level=e.government_level,
                election_subtype=e.election_subtype,
                start_time=e.start_time,
                end_time=e.end_time,
                contest_count=sum(counts.values()),
                fptp_count=counts.get("FPTP", 0),
                pr_count=counts.get("PR", 0),
                contest_counts=counts,
                created_at=e.created_at,
            )
        )
    return result


@router.get("/master-data/status")
def master_data_status(
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    return get_master_data_status(db)


@router.get("/{election_id}", response_model=ElectionRead)
def get_election(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


# ── Create ──────────────────────────────────────────────────────

@router.post("/", response_model=ElectionRead, status_code=201)
def create_election_endpoint(
    body: ElectionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    try:
        election = create_election(
            db,
            title=body.title,
            description=body.description,
            government_level=body.government_level,
            election_subtype=body.election_subtype,
            start_time=body.start_time,
            end_time=body.end_time,
            created_by=user.id,
        )
    except ElectionServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return election


# ── Update ──────────────────────────────────────────────────────

@router.patch("/{election_id}", response_model=ElectionRead)
def update_election_endpoint(
    election_id: int,
    body: ElectionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    try:
        kwargs: dict = {}
        if body.title is not None:
            kwargs["title"] = body.title
        if body.description is not None:
            kwargs["description"] = body.description
        else:
            kwargs["description"] = ...  # sentinel: no change
        if body.start_time is not None:
            kwargs["start_time"] = body.start_time
        if body.end_time is not None:
            kwargs["end_time"] = body.end_time
        election = update_election(db, election, **kwargs)
    except ElectionServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return election


# ── Delete ──────────────────────────────────────────────────────

@router.delete("/{election_id}", status_code=204)
def delete_election_endpoint(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    try:
        delete_election(db, election)
    except ElectionServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Structure generation ────────────────────────────────────────

@router.post(
    "/{election_id}/generate-structure",
    response_model=StructureGenerationResult,
)
def generate_structure(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    try:
        result = generate_election_structure(db, election)
    except ElectionServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ── Contests ────────────────────────────────────────────────────

@router.get("/{election_id}/contests", response_model=list[ContestRead])
def list_contests(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election_repository.get_contests(db, election_id)


# ── Readiness ───────────────────────────────────────────────────

@router.get("/{election_id}/readiness", response_model=ReadinessCheck)
def readiness_check(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return check_structure_readiness(db, election)


# ── Configure (DRAFT → CONFIGURED) ─────────────────────────────

@router.post("/{election_id}/configure", response_model=ElectionRead)
def configure_election_endpoint(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    try:
        election = configure_election(db, election)
    except ElectionServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return election
