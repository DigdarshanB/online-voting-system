"""Admin party management routes.

Endpoints:
  GET    /admin/parties           — list parties
  POST   /admin/parties           — create party
  GET    /admin/parties/{id}      — get party detail
  PATCH  /admin/parties/{id}      — update party
  DELETE /admin/parties/{id}      — delete party
  POST   /admin/parties/{id}/symbol — upload party election symbol
  DELETE /admin/parties/{id}/symbol — remove party election symbol
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.repositories import party_repository
from app.schemas.party import PartyCreate, PartyRead, PartyUpdate
from app.services.party_service import PartyServiceError, create_party, delete_party, update_party

router = APIRouter(prefix="/admin/parties", tags=["parties"])

_UPLOAD_BASE = Path(__file__).resolve().parents[2] / "uploads" / "party_symbols"
_MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_EXT_MAP = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def _detect_image_type(data: bytes) -> str | None:
    if len(data) < 8:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


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


@router.post("/{party_id}/symbol", response_model=PartyRead)
async def upload_party_symbol(
    party_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    party = party_repository.get_by_id(db, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    data = await file.read()
    if len(data) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 2 MB)")
    if len(data) < 100:
        raise HTTPException(status_code=400, detail="File too small or empty")

    detected = _detect_image_type(data)
    if detected not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are allowed")

    ext = _EXT_MAP[detected]
    party_dir = _UPLOAD_BASE / str(party_id)
    party_dir.mkdir(parents=True, exist_ok=True)

    # Remove old symbol files
    for old in party_dir.glob("symbol.*"):
        old.unlink(missing_ok=True)

    filename = f"symbol.{ext}"
    file_path = party_dir / filename
    file_path.write_bytes(data)

    relative_path = f"uploads/party_symbols/{party_id}/{filename}"
    party.symbol_path = relative_path
    db.commit()
    db.refresh(party)
    return party


@router.delete("/{party_id}/symbol", response_model=PartyRead)
def remove_party_symbol(
    party_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    party = party_repository.get_by_id(db, party_id)
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")

    if party.symbol_path:
        old_file = Path(__file__).resolve().parents[2] / party.symbol_path
        if old_file.exists():
            old_file.unlink(missing_ok=True)
        party.symbol_path = None
        db.commit()
        db.refresh(party)
    return party
