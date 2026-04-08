from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class AdminInviteBase(BaseModel):
    recipient_identifier: EmailStr


class AdminInviteCreate(AdminInviteBase):
    pass


class AdminInviteUpdate(BaseModel):
    status: Optional[str] = None


class AdminInviteRead(BaseModel):
    id: int
    recipient_identifier: EmailStr
    invite_code: str
    activation_url: str
    status: str
    expires_at: datetime
    created_at: datetime
    used_at: Optional[datetime] = None

    class Config:
        orm_mode = True
