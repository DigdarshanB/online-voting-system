"""Count run model — tracks a single ballot-counting session for an election."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

COUNT_RUN_STATUS_VALUES = ("PENDING", "RUNNING", "COMPLETED", "FAILED")


class CountRun(Base):
    """One counting session.  An election may have multiple runs
    (e.g. recount) but only one may be marked ``is_final``."""

    __tablename__ = "count_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    election_id: Mapped[int] = mapped_column(
        ForeignKey("elections.id", name="fk_cr_election"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", name="fk_cr_created_by"),
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Aggregate counts
    total_ballots_counted: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_fptp_adjudication: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
    )
    total_pr_adjudication: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0",
    )

    # Finalization / locking flags
    is_final: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0",
    )
    is_locked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0",
    )
