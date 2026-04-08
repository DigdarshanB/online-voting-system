from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PrPartyListEntry(Base):
    """One row in a party's PR closed list: candidate at a given position."""

    __tablename__ = "pr_party_list_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("pr_party_submissions.id", name="fk_pr_entry_submission"),
        nullable=False, index=True,
    )
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_profiles.id", name="fk_pr_entry_candidate"),
        nullable=False, index=True,
    )
    list_position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "submission_id", "candidate_id",
            name="uq_pr_entry_submission_candidate",
        ),
        UniqueConstraint(
            "submission_id", "list_position",
            name="uq_pr_entry_submission_position",
        ),
    )
