from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ElectionContest(Base):
    """A single contest within an election.

    For a Federal HoR election, there will be:
      - 165 FPTP constituency contests (one per constituency)
      - 1   PR national contest
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
    )  # "FPTP" or "PR"
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    seat_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # FPTP contests link to a constituency; PR contests leave this null
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
            "election_id", "contest_type", "constituency_id",
            name="uq_election_contest_slot",
        ),
    )
