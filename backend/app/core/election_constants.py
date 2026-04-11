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


# ── Local ───────────────────────────────────────────────────────
# Nepal local direct elections: each voter casts 7 FPTP selections per ward.
#
# Local bodies are of two kinds:
#   URBAN: MUNICIPALITY, METROPOLITAN, SUB_METROPOLITAN → elect Mayor + Deputy Mayor
#   RURAL: RURAL_MUNICIPALITY → elect Chairperson + Vice Chairperson
#
# Ward-level (both urban and rural): Ward Chairperson, Woman Ward Member,
# Dalit Woman Ward Member, Open Ward Member ×2.
#
# All 7 positions are FPTP (first-past-the-post, single winner).
# There is NO proportional representation in local direct elections.

# All local body categories (used for counting, geography validation, etc.)
LOCAL_BODY_CATEGORIES = ("MUNICIPALITY", "RURAL_MUNICIPALITY", "METROPOLITAN", "SUB_METROPOLITAN")

# Urban-only local bodies (elect Mayor + Deputy Mayor)
URBAN_LOCAL_BODY_CATEGORIES = ("MUNICIPALITY", "METROPOLITAN", "SUB_METROPOLITAN")

# Rural-only local bodies (elect Chairperson + Vice Chairperson)
RURAL_LOCAL_BODY_CATEGORIES = ("RURAL_MUNICIPALITY",)

# ── Ward-level contest types ───────────────────────────────────
CONTEST_TYPE_WARD_WOMAN_MEMBER = "WARD_WOMAN_MEMBER"
CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER = "WARD_DALIT_WOMAN"
CONTEST_TYPE_WARD_OPEN_MEMBER_1 = "WARD_OPEN_MEMBER_1"
CONTEST_TYPE_WARD_OPEN_MEMBER_2 = "WARD_OPEN_MEMBER_2"

# All 7 local direct-election contest types (one ballot = 7 selections)
LOCAL_HEAD_CONTEST_TYPES = (CONTEST_TYPE_MAYOR, CONTEST_TYPE_DEPUTY_MAYOR)
LOCAL_WARD_CONTEST_TYPES = (
    CONTEST_TYPE_WARD_CHAIR,
    CONTEST_TYPE_WARD_WOMAN_MEMBER,
    CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
    CONTEST_TYPE_WARD_OPEN_MEMBER_1,
    CONTEST_TYPE_WARD_OPEN_MEMBER_2,
)
ALL_LOCAL_CONTEST_TYPES = LOCAL_HEAD_CONTEST_TYPES + LOCAL_WARD_CONTEST_TYPES

LOCAL_MUNICIPAL = ElectionStructureDef(
    government_level="LOCAL",
    election_subtype="LOCAL_MUNICIPAL",
    description=(
        "Urban local body elections — Mayor + Deputy Mayor per body, "
        "5 ward-level positions per ward. 7 FPTP selections per voter."
    ),
    contest_defs=[
        ContestDef(
            CONTEST_TYPE_MAYOR,
            area_category=None,  # handled specially: iterate URBAN_LOCAL_BODY_CATEGORIES
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
        ContestDef(
            CONTEST_TYPE_WARD_CHAIR,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Ward Chairperson – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_WOMAN_MEMBER,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Woman Ward Member – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Dalit Woman Ward Member – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_OPEN_MEMBER_1,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Open Ward Member 1 – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_OPEN_MEMBER_2,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Open Ward Member 2 – {area_name}",
        ),
    ],
)

LOCAL_RURAL = ElectionStructureDef(
    government_level="LOCAL",
    election_subtype="LOCAL_RURAL",
    description=(
        "Rural municipality elections — Chairperson + Vice Chairperson per body, "
        "5 ward-level positions per ward. 7 FPTP selections per voter."
    ),
    contest_defs=[
        ContestDef(
            CONTEST_TYPE_MAYOR,
            area_category="RURAL_MUNICIPALITY",
            seat_count=1,
            per_area=True,
            title_template="Chairperson – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_DEPUTY_MAYOR,
            area_category="RURAL_MUNICIPALITY",
            seat_count=1,
            per_area=True,
            title_template="Vice Chairperson – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_CHAIR,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Ward Chairperson – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_WOMAN_MEMBER,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Woman Ward Member – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Dalit Woman Ward Member – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_OPEN_MEMBER_1,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Open Ward Member 1 – {area_name}",
        ),
        ContestDef(
            CONTEST_TYPE_WARD_OPEN_MEMBER_2,
            area_category="WARD",
            seat_count=1,
            per_area=True,
            title_template="Open Ward Member 2 – {area_name}",
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
