from pydantic import BaseModel, EmailStr, constr

from app.models.user import UserRole


# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


# Properties to receive on item creation
class UserCreate(UserBase):
    email: EmailStr
    password: str
    full_name: str


# Properties to receive on item update
class UserUpdate(UserBase):
    password: Optional[str] = None


# Properties shared by models stored in DB
class UserInDBBase(UserBase):
    id: int
    role: UserRole
    email: Optional[EmailStr]
    full_name: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime] = None
    phone_number: Optional[str] = None
    citizenship_no: Optional[str] = None
    face_image_url: Optional[str] = None
    is_verified: bool = False
    is_active: bool = True
    totp_secret: Optional[str] = None
    totp_enabled_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        orm_mode = True


# Properties to return to client
class UserRead(BaseModel):
    id: int
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: UserRole
    phone_number: Optional[str] = None
    citizenship_no_normalized: Optional[str] = None
    approved_at: Optional[datetime] = None
    totp_enabled_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        orm_mode = True


# Properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str