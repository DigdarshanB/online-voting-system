from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PrPartySubmission(Base):
    """A party's PR closed-list submission for one election."""

    __tablename__ = "pr_party_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    election_id: Mapped[int] = mapped_column(
        ForeignKey("elections.id", name="fk_pr_sub_election"),
        nullable=False, index=True,
    )
    party_id: Mapped[int] = mapped_column(
        ForeignKey("parties.id", name="fk_pr_sub_party"),
        nullable=False, index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="DRAFT",
    )  # DRAFT, SUBMITTED, VALIDATED, INVALID, APPROVED, REJECTED
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_pr_sub_reviewer"),
        nullable=True,
    )
    validation_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "election_id", "party_id",
            name="uq_pr_sub_election_party",
        ),
    )
