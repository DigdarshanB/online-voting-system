from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)  # MALE, FEMALE, OTHER
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    citizenship_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    qualifications: Mapped[str | None] = mapped_column(Text, nullable=True)
    party_id: Mapped[int | None] = mapped_column(
        ForeignKey("parties.id", name="fk_cp_party"), nullable=True, index=True,
    )
    government_level: Mapped[str] = mapped_column(String(20), nullable=False, default="FEDERAL", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )
