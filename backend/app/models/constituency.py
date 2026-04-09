from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Constituency(Base):
    __tablename__ = "constituencies"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(10), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    name_ne: Mapped[str | None] = mapped_column(String(160), nullable=True)
    constituency_number: Mapped[int] = mapped_column(Integer, nullable=False)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", name="fk_constituencies_district"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    district = relationship("District", back_populates="constituencies", lazy="select")

    __table_args__ = (
        UniqueConstraint("district_id", "constituency_number", name="uq_district_constituency"),
    )
