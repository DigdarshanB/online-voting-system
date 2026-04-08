from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Ballot(Base):
    """One dual-ballot cast per voter per election.

    Stores the voter's constituency at cast-time for audit trail.
    Actual vote data lives in the associated ballot_entries rows.
    """

    __tablename__ = "ballots"

    id: Mapped[int] = mapped_column(primary_key=True)
    election_id: Mapped[int] = mapped_column(
        ForeignKey("elections.id", name="fk_ballots_election"),
        nullable=False,
        index=True,
    )
    voter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", name="fk_ballots_voter"),
        nullable=False,
        index=True,
    )
    constituency_id: Mapped[int] = mapped_column(
        ForeignKey("constituencies.id", name="fk_ballots_constituency"),
        nullable=False,
    )
    cast_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "election_id", "voter_id",
            name="uq_one_ballot_per_voter_per_election",
        ),
    )
