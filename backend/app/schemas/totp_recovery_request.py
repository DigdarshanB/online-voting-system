from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.totp_recovery_request import RecoveryRequestStatus


class TOTPRecoveryRequestBase(BaseModel):
    user_id: int
    reason: Optional[str] = None


class TOTPRecoveryRequestCreate(TOTPRecoveryRequestBase):
    pass


class TOTPRecoveryRequestUpdate(BaseModel):
    status: Optional[RecoveryRequestStatus] = None
    rejection_reason: Optional[str] = None


class TOTPRecoveryRequestRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    requested_at: datetime
    status: RecoveryRequestStatus
    reason: Optional[str] = None
    last_login_at: Optional[datetime] = None

    class Config:
        orm_mode = True
