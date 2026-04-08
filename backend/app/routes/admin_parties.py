"""Admin party management routes.

Endpoints:
  GET    /admin/parties           — list parties
  POST   /admin/parties           — create party
  GET    /admin/parties/{id}      — get party detail
  PATCH  /admin/parties/{id}      — update party
  DELETE /admin/parties/{id}      — delete party
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.repositories import party_repository
from app.schemas.party import PartyCreate, PartyRead, PartyUpdate
from app.services.party_service import PartyServiceError, create_party, delete_party, update_party

router = APIRouter(prefix="/admin/parties", tags=["parties"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/", response_model=list[PartyRead])
def list_parties(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    return party_repository.list_all(db, limit=limit, offset=offset, active_only=active_only)


@router.post("/", response_model=PartyRead, status_code=201)
def create_party_endpoint(
    body: PartyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    try:
        party = create_party(
            db,
            name=body.name,
            abbreviation=body.abbreviation,
            name_ne=body.name_ne,
            symbol_description=body.symbol_description,
            registration_number=body.registration_number,
            address=body.address,
            established_date=body.established_date,
        )
    except PartyServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return party


@router.get("/{party_id}", response_model=PartyRead)
def get_party(
    party_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    party = party_repository.get_by_id(db, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    return party


@router.patch("/{party_id}", response_model=PartyRead)
def update_party_endpoint(
    party_id: int,
    body: PartyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    party = party_repository.get_by_id(db, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    kwargs: dict = {}
    if body.name is not None:
        kwargs["name"] = body.name
    if body.abbreviation is not None:
        kwargs["abbreviation"] = body.abbreviation
    if body.name_ne is not None:
        kwargs["name_ne"] = body.name_ne
    else:
        kwargs["name_ne"] = ...
    if body.symbol_description is not None:
        kwargs["symbol_description"] = body.symbol_description
    else:
        kwargs["symbol_description"] = ...
    if body.registration_number is not None:
        kwargs["registration_number"] = body.registration_number
    else:
        kwargs["registration_number"] = ...
    if body.address is not None:
        kwargs["address"] = body.address
    else:
        kwargs["address"] = ...
    if body.established_date is not None:
        kwargs["established_date"] = body.established_date
    else:
        kwargs["established_date"] = ...
    if body.is_active is not None:
        kwargs["is_active"] = body.is_active
    try:
        party = update_party(db, party, **kwargs)
    except PartyServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return party


@router.delete("/{party_id}", status_code=204)
def delete_party_endpoint(
    party_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    party = party_repository.get_by_id(db, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    try:
        delete_party(db, party)
    except PartyServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
