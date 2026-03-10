from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="voter")  # voter/admin
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    citizenship_no_raw: Mapped[str | None] = mapped_column(String(50), nullable=True)
    citizenship_no_normalized: Mapped[str | None] = mapped_column(
        String(16), unique=True, index=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    citizenship_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    face_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    face_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    totp_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    totp_enabled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
