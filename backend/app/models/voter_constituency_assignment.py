from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VoterConstituencyAssignment(Base):
    __tablename__ = "voter_constituency_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    voter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", name="fk_vca_voter"),
        nullable=False,
        index=True,
    )
    constituency_id: Mapped[int] = mapped_column(
        ForeignKey("constituencies.id", name="fk_vca_constituency"),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("voter_id", name="uq_one_constituency_per_voter"),
    )
