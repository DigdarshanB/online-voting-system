"""Election structure definitions for all government levels.

Each (government_level, election_subtype) maps to a structure definition
that tells the service how to generate contests.

This replaces the federal-only assumptions in the old federal_constants.py.
The old file is preserved for backward compatibility but new code should
use this module's ELECTION_STRUCTURES dict.
"""

from app.core.federal_constants import (
    CONTEST_TYPE_FPTP,
    CONTEST_TYPE_PR,
    FEDERAL_HOR_FPTP_SEATS,
    FEDERAL_HOR_PR_SEATS,
    FPTP_SEATS_PER_CONSTITUENCY,
    PR_THRESHOLD_FRACTION,
)


# ── Contest types ───────────────────────────────────────────────

# Reexport from federal_constants for convenience
# plus new types for local elections
CONTEST_TYPE_MAYOR = "MAYOR"
CONTEST_TYPE_DEPUTY_MAYOR = "DEPUTY_MAYOR"
CONTEST_TYPE_WARD_CHAIR = "WARD_CHAIR"


# ── Structure definitions ───────────────────────────────────────

class ContestDef:
    """Defines one contest type within an election structure."""

    def __init__(
        self,
        contest_type: str,
        *,
        area_category: str | None,  # which area_units.category to target; None = nationwide
        seat_count: int = 1,
        per_area: bool = True,      # one contest per matching area unit
        title_template: str = "{contest_type} – {area_name}",
    ):
        self.contest_type = contest_type
        self.area_category = area_category
        self.seat_count = seat_count
        self.per_area = per_area
        self.title_template = title_template


class ElectionStructureDef:
    """Defines the full contest structure for an election type."""

    def __init__(
        self,
        *,
        government_level: str,
        election_subtype: str,
        description: str,
        contest_defs: list[ContestDef],
        area_filter: dict | None = None,  # optional filter for area_units query
    ):
        self.government_level = government_level
        self.election_subtype = election_subtype
        self.description = description
        self.contest_defs = contest_defs
        self.area_filter = area_filter or {}


# ── Federal HoR Direct ─────────────────────────────────────────

FEDERAL_HOR_DIRECT = ElectionStructureDef(
    government_level="FEDERAL",
    election_subtype="HOR_DIRECT",
    description="Federal House of Representatives — 165 FPTP + 1 PR",
    contest_defs=[
        ContestDef(
            CONTEST_TYPE_FPTP,
            area_category="CONSTITUENCY",
            seat_count=FPTP_SEATS_PER_CONSTITUENCY,
            per_area=True,
            title_template="FPTP – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_PR,
            area_category=None,  # nationwide
            seat_count=FEDERAL_HOR_PR_SEATS,
            per_area=False,
            title_template="PR – National Proportional Representation",
        ),
    ],
)


# ── Provincial Assembly ────────────────────────────────────────
# Nepal's Provincial Assembly elections use FPTP + PR per province.
# N FPTP contests per province (one per federal constituency in that province)
# + 1 province-wide PR contest (seat_count = N, per Article 176).
# The actual generation and seat_count assignment is handled by
# election_service._generate_provincial_assembly() using provincial_constants.
# This ContestDef is kept for registry/documentation purposes.

PROVINCIAL_ASSEMBLY = ElectionStructureDef(
    government_level="PROVINCIAL",
    election_subtype="PROVINCIAL_ASSEMBLY",
    description="Provincial Assembly — N FPTP per province constituency + 1 PR per province (N seats)",
    contest_defs=[
        ContestDef(
            CONTEST_TYPE_FPTP,
            area_category="CONSTITUENCY",
            seat_count=FPTP_SEATS_PER_CONSTITUENCY,
            per_area=True,
            title_template="Provincial FPTP – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_PR,
            area_category="PROVINCE",
            seat_count=0,  # set dynamically from provincial_constants per province
            per_area=False,
            title_template="Provincial PR – {area_name}",
        ),
    ],
)


# ── Local Municipal ─────────────────────────────────────────────
# Local body elections elect a mayor + deputy mayor per municipality/metro/sub-metro.
# Ward-level positions can be added later.

LOCAL_BODY_CATEGORIES = ("MUNICIPALITY", "RURAL_MUNICIPALITY", "METROPOLITAN", "SUB_METROPOLITAN")

LOCAL_MUNICIPAL = ElectionStructureDef(
    government_level="LOCAL",
    election_subtype="LOCAL_MUNICIPAL",
    description="Local body elections — Mayor + Deputy Mayor per local body",
    contest_defs=[
        ContestDef(
            CONTEST_TYPE_MAYOR,
            area_category=None,  # handled specially: iterate LOCAL_BODY_CATEGORIES
            seat_count=1,
            per_area=True,
            title_template="Mayor – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_DEPUTY_MAYOR,
            area_category=None,
            seat_count=1,
            per_area=True,
            title_template="Deputy Mayor – {area_name}",
        ),
    ],
)

LOCAL_RURAL = ElectionStructureDef(
    government_level="LOCAL",
    election_subtype="LOCAL_RURAL",
    description="Rural municipality elections — Chair + Vice Chair per rural municipality",
    contest_defs=[
        ContestDef(
            CONTEST_TYPE_MAYOR,
            area_category="RURAL_MUNICIPALITY",
            seat_count=1,
            per_area=True,
            title_template="Chair – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_DEPUTY_MAYOR,
            area_category="RURAL_MUNICIPALITY",
            seat_count=1,
            per_area=True,
            title_template="Vice Chair – {area_name}",
        ),
    ],
)


# ── Registry ───────────────────────────────────────────────────

ELECTION_STRUCTURES: dict[tuple[str, str], ElectionStructureDef] = {
    ("FEDERAL", "HOR_DIRECT"): FEDERAL_HOR_DIRECT,
    ("PROVINCIAL", "PROVINCIAL_ASSEMBLY"): PROVINCIAL_ASSEMBLY,
    ("LOCAL", "LOCAL_MUNICIPAL"): LOCAL_MUNICIPAL,
    ("LOCAL", "LOCAL_RURAL"): LOCAL_RURAL,
}


def get_structure_def(government_level: str, election_subtype: str) -> ElectionStructureDef | None:
    """Look up the structure definition for a given election type."""
    return ELECTION_STRUCTURES.get((government_level, election_subtype))
