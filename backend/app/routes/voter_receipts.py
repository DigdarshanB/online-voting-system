from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.services.ballot_service import list_voter_receipts

router = APIRouter(prefix="/voter/receipts", tags=["voter-receipts"])


def _require_active_voter(user: User) -> None:
    if user.role != "voter":
        raise HTTPException(status_code=403, detail="Voter access required")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is not active")


@router.get("")
def get_voter_receipts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all vote receipts for the authenticated voter."""
    _require_active_voter(user)
    return list_voter_receipts(db, user)
