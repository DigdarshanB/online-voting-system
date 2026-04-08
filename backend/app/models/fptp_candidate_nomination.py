from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FptpCandidateNomination(Base):
    """A single FPTP nomination: one candidate for one constituency contest."""

    __tablename__ = "fptp_candidate_nominations"

    id: Mapped[int] = mapped_column(primary_key=True)
    election_id: Mapped[int] = mapped_column(
        ForeignKey("elections.id", name="fk_fptp_nom_election"),
        nullable=False, index=True,
    )
    contest_id: Mapped[int] = mapped_column(
        ForeignKey("election_contests.id", name="fk_fptp_nom_contest"),
        nullable=False, index=True,
    )
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_profiles.id", name="fk_fptp_nom_candidate"),
        nullable=False, index=True,
    )
    party_id: Mapped[int | None] = mapped_column(
        ForeignKey("parties.id", name="fk_fptp_nom_party"),
        nullable=True, index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING",
    )  # PENDING, APPROVED, REJECTED, WITHDRAWN
    nominated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_fptp_nom_reviewer"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "contest_id", "candidate_id",
            name="uq_fptp_nom_contest_candidate",
        ),
    )
