"""Voter ↔ AreaUnit assignment, scoped per government level.

Additive alongside the legacy ``voter_constituency_assignments`` table
(kept for federal HoR flows). The ``government_level`` column allows one
assignment per level per voter, so a single voter can hold federal,
provincial, and local assignments simultaneously.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VoterAreaAssignment(Base):
    __tablename__ = "voter_area_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)

    voter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", name="fk_vaa_voter"),
        nullable=False,
        index=True,
    )

    # The assigned geographic area (e.g. a CONSTITUENCY area_unit for provincial,
    # or a MUNICIPALITY area_unit for local elections).
    area_id: Mapped[int] = mapped_column(
        ForeignKey("area_units.id", name="fk_vaa_area"),
        nullable=False,
        index=True,
    )

    # Which government level this assignment applies to.
    # Allows one assignment per level per voter (see unique constraint below).
    government_level: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
    )  # "FEDERAL", "PROVINCIAL", "LOCAL"

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_vaa_assigned_by"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "voter_id", "government_level",
            name="uq_voter_area_one_per_level",
        ),
    )
