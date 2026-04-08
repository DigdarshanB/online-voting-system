from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class TOTPRecoveryRequestBase(BaseModel):
    user_id: int
    reason: Optional[str] = None


class TOTPRecoveryRequestCreate(TOTPRecoveryRequestBase):
    pass


class TOTPRecoveryRequestUpdate(BaseModel):
    status: Optional[str] = None
    rejection_reason: Optional[str] = None


class TOTPRecoveryRequestRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    requested_at: datetime
    status: str
    reason: Optional[str] = None
    last_login_at: Optional[datetime] = None

    class Config:
        orm_mode = True
