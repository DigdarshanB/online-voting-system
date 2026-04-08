from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


# ── Enums matching the real DB ──────────────────────────────────

ELECTION_STATUS_VALUES = (
    "DRAFT",
    "CONFIGURED",
    "NOMINATIONS_OPEN",
    "NOMINATIONS_CLOSED",
    "CANDIDATE_LIST_PUBLISHED",
    "POLLING_OPEN",
    "POLLING_CLOSED",
    "COUNTING",
    "FINALIZED",
    "ARCHIVED",
)

GOVERNMENT_LEVEL_VALUES = ("FEDERAL", "PROVINCIAL", "LOCAL")

ELECTION_SUBTYPE_VALUES = (
    "HOR_DIRECT",
    "PROVINCIAL_ASSEMBLY",
    "LOCAL_MUNICIPAL",
    "LOCAL_RURAL",
    "NATIONAL_ASSEMBLY_INDIRECT",
    "DISTRICT_COORDINATION_INDIRECT",
)

ElectionStatusEnum = Enum(
    *ELECTION_STATUS_VALUES, name="election_status_enum", create_constraint=False
)
GovernmentLevelEnum = Enum(
    *GOVERNMENT_LEVEL_VALUES, name="government_level_enum", create_constraint=False
)
ElectionSubtypeEnum = Enum(
    *ELECTION_SUBTYPE_VALUES, name="election_subtype_enum", create_constraint=False
)


class Election(Base):
    __tablename__ = "elections"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # election_type kept for backward compat; new code should use government_level + election_subtype
    election_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    status: Mapped[str] = mapped_column(
        ElectionStatusEnum, nullable=False, default="DRAFT", server_default="DRAFT", index=True,
    )
    government_level: Mapped[str | None] = mapped_column(
        GovernmentLevelEnum, nullable=True, index=True,
    )
    election_subtype: Mapped[str | None] = mapped_column(
        ElectionSubtypeEnum, nullable=True, index=True,
    )

    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Lifecycle timestamps
    nomination_open_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    nomination_close_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    candidate_list_publish_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    polling_start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    polling_end_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    counting_start_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result_publish_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_elections_created_by_users"), nullable=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(), index=True,
    )
    result_visible_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
