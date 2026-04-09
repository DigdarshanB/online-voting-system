from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ElectionContest(Base):
    """A single contest within an election.

    For a Federal HoR election:  165 FPTP constituency contests + 1 PR national contest.
    For Provincial:  FPTP per province constituency + 1 PR per province.
    For Local:  ward-level or municipality-level contests.

    `area_id` points to the area_units table — the universal geography target.
    `constituency_id` is preserved for backward compatibility with existing FKs.
    """

    __tablename__ = "election_contests"

    id: Mapped[int] = mapped_column(primary_key=True)
    election_id: Mapped[int] = mapped_column(
        ForeignKey("elections.id", name="fk_ec_election"),
        nullable=False,
        index=True,
    )
    contest_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
    )  # "FPTP", "PR", "WARD", "MAYOR", etc.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    seat_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── Generic area targeting (new: works for all levels) ──────
    area_id: Mapped[int | None] = mapped_column(
        ForeignKey("area_units.id", name="fk_ec_area_unit"),
        nullable=True,
        index=True,
    )

    # ── Legacy: federal constituency FK (kept for backward compat) ──
    constituency_id: Mapped[int | None] = mapped_column(
        ForeignKey("constituencies.id", name="fk_ec_constituency"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "election_id", "contest_type", "area_id",
            name="uq_election_contest_slot_v2",
        ),
    )
