"""Unified geographic/administrative area model.

Stores ALL Nepal geography in one hierarchical table:
  COUNTRY → PROVINCE → DISTRICT → CONSTITUENCY (federal)
                                → MUNICIPALITY / RURAL_MUNICIPALITY / METROPOLITAN / SUB_METROPOLITAN (local)

Used by ElectionContest to target contests at any government level.
The existing districts/constituencies tables remain for backward compatibility
with voter_constituency_assignments and other existing FKs.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


# All valid category values matching the JSON source
AREA_CATEGORIES = (
    "COUNTRY",
    "PROVINCE",
    "DISTRICT",
    "CONSTITUENCY",         # federal HoR constituency
    "MUNICIPALITY",
    "RURAL_MUNICIPALITY",
    "METROPOLITAN",
    "SUB_METROPOLITAN",
)


class AreaUnit(Base):
    """A single node in Nepal's administrative geography tree.

    Examples:
      code="NP",     category="COUNTRY",    parent_code=None,  name="Nepal"
      code="P1",     category="PROVINCE",   parent_code="NP",  name="Koshi Province"
      code="D04",    category="DISTRICT",   parent_code="P1",  name="Jhapa"
      code="FC005",  category="CONSTITUENCY", parent_code="D04", name="Jhapa-1"
      code="LB0324", category="METROPOLITAN", parent_code="D28", name="Kathmandu"
    """

    __tablename__ = "area_units"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(
        String(10), nullable=False, unique=True, index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    name_ne: Mapped[str | None] = mapped_column(String(160), nullable=True)
    category: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True,
    )
    parent_code: Mapped[str | None] = mapped_column(
        String(10), nullable=True, index=True,
    )
    # Denormalized province number for quick filtering (null for COUNTRY)
    province_number: Mapped[int | None] = mapped_column(
        Integer, nullable=True, index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
