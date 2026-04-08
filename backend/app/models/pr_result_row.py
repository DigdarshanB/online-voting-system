"""PR result row — one row per party in a count run's proportional-representation tally."""

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PrResultRow(Base):
    """Proportional-representation tally for a single party."""

    __tablename__ = "pr_result_rows"

    id: Mapped[int] = mapped_column(primary_key=True)
    count_run_id: Mapped[int] = mapped_column(
        ForeignKey("count_runs.id", name="fk_pr_rr_count_run"),
        nullable=False,
        index=True,
    )
    party_id: Mapped[int] = mapped_column(
        ForeignKey("parties.id", name="fk_pr_rr_party"),
        nullable=False,
    )
    # Denormalized snapshot
    party_name: Mapped[str] = mapped_column(String(255), nullable=False)

    valid_votes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vote_share_pct: Mapped[float] = mapped_column(
        Numeric(10, 6), nullable=False, default=0,
    )
    meets_threshold: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0",
    )
    allocated_seats: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
    )

    # For exact reproducibility of the Sainte-Laguë tie-breaking audit.
    # Stores the numerator (= valid_votes) and the highest divisor that
    # earned this party its last seat.  Quotient = numerator / divisor.
    highest_quotient_numerator: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )
    highest_quotient_divisor: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
    )

    requires_adjudication: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0",
    )
