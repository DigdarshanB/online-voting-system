"""Voter area assignment — maps a voter to an AreaUnit for a specific government level.

This table is ADDITIVE alongside the existing voter_constituency_assignments table.
The legacy table is preserved for federal HoR flows that are already working.

For provincial elections the voter is assigned to the CONSTITUENCY area_unit
within their province.  The government_level column allows one assignment per
level per voter, so a voter can have both a federal and a provincial assignment
without conflict.

For local elections the area_unit would be the MUNICIPALITY / RURAL_MUNICIPALITY /
METROPOLITAN / SUB_METROPOLITAN the voter is registered in.
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
