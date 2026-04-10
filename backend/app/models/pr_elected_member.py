"""PR elected member — persists each seat won via proportional representation.

After the Sainte-Laguë allocation in count_service, the elected candidates
are written here for permanent record.  Each row represents one PR seat
awarded to a specific candidate from a party's closed list for a specific
election contest (PR contest).

This table is populated during counting / finalization; it does NOT replace
the pr_result_rows table which stores the per-party aggregate tallies.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PrElectedMember(Base):
    __tablename__ = "pr_elected_members"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Which count run produced this result.
    count_run_id: Mapped[int] = mapped_column(
        ForeignKey("count_runs.id", name="fk_prem_count_run"),
        nullable=False,
        index=True,
    )

    # The PR contest this seat belongs to.
    contest_id: Mapped[int] = mapped_column(
        ForeignKey("election_contests.id", name="fk_prem_contest"),
        nullable=False,
        index=True,
    )

    # The party that won this seat.
    party_id: Mapped[int] = mapped_column(
        ForeignKey("parties.id", name="fk_prem_party"),
        nullable=False,
        index=True,
    )

    # The candidate who fills this seat (from the party's closed list).
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidate_profiles.id", name="fk_prem_candidate"),
        nullable=False,
        index=True,
    )

    # The list entry that nominated this candidate (for audit).
    list_entry_id: Mapped[int | None] = mapped_column(
        ForeignKey("pr_party_list_entries.id", name="fk_prem_list_entry"),
        nullable=True,
    )

    # 1-based seat number within this contest's allocation.
    seat_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Denormalized snapshot for display.
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    party_name: Mapped[str] = mapped_column(String(255), nullable=False)

    elected_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
