"""FPTP result row — one row per candidate per contest in a count run."""

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FptpResultRow(Base):
    """Vote tally for a single FPTP candidate in one contest."""

    __tablename__ = "fptp_result_rows"

    id: Mapped[int] = mapped_column(primary_key=True)
    count_run_id: Mapped[int] = mapped_column(
        ForeignKey("count_runs.id", name="fk_fptp_rr_count_run"),
        nullable=False,
        index=True,
    )
    contest_id: Mapped[int] = mapped_column(
        ForeignKey("election_contests.id", name="fk_fptp_rr_contest"),
        nullable=False,
        index=True,
    )
    nomination_id: Mapped[int] = mapped_column(
        ForeignKey("fptp_candidate_nominations.id", name="fk_fptp_rr_nomination"),
        nullable=False,
    )
    # Denormalized snapshot for display
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    party_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    vote_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_winner: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0",
    )
    requires_adjudication: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0",
    )
