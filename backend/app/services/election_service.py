"""Election management service — CRUD, structure generation, readiness checks.

Business rules enforced here:
- Structure generation dispatches by (government_level, election_subtype)
- Federal HoR: 165 FPTP + 1 PR contest atomically
- Provincial Assembly: N FPTP + 1 PR per province (N = constituency count)
- Local: 2 head contests per local body + 4 ward contests per ward
  (WARD_MEMBER_OPEN has seat_count=2, total 7 selections per voter)
- Ward data is REQUIRED for local election structure generation
- Generation blocked unless area_units master data is sufficient
- Only DRAFT elections may have structure generated or be edited/deleted
- Configure (DRAFT→CONFIGURED) blocked unless structure passes readiness
- Lifecycle transitions enforced via ALLOWED_TRANSITIONS map
"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.federal_constants import (
    CONTEST_TYPE_FPTP,
    CONTEST_TYPE_PR,
    FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
    FEDERAL_HOR_PR_SEATS,
    FPTP_SEATS_PER_CONSTITUENCY,
)
from app.core.election_constants import (
    LOCAL_BODY_CATEGORIES,
    get_structure_def,
)
from app.core.geography_loader import EXPECTED_PROVINCE_CONSTITUENCY_COUNTS
from app.core.provincial_constants import PROVINCIAL_PR_SEATS
from app.models.area_unit import AreaUnit
from app.models.constituency import Constituency
from app.models.election import Election
from app.models.election_contest import ElectionContest
from app.repositories import election_repository


# ── Lifecycle helpers ───────────────────────────────────────────

EDITABLE_STATUSES = ("DRAFT",)
STRUCTURE_GEN_STATUSES = ("DRAFT",)
CONFIGURABLE_STATUSES = ("DRAFT",)


def _require_status(election: Election, allowed: tuple[str, ...], action: str) -> None:
    if election.status not in allowed:
        raise ElectionServiceError(
            f"Cannot {action}: election is in status '{election.status}', "
            f"must be one of {allowed}"
        )


class ElectionServiceError(Exception):
    """Raised for business-rule violations in election management."""


# ── CRUD ────────────────────────────────────────────────────────

def create_election(
    db: Session,
    *,
    title: str,
    description: str | None,
    government_level: str,
    election_subtype: str,
    province_code: str | None = None,
    start_time,
    end_time,
    created_by: int,
) -> Election:
    if end_time <= start_time:
        raise ElectionServiceError("end_time must be after start_time")

    # Validate that we have a known structure definition
    struct_def = get_structure_def(government_level, election_subtype)
    if struct_def is None:
        raise ElectionServiceError(
            f"Unsupported election type: {government_level}/{election_subtype}"
        )

    # For provincial elections, resolve scope_area_id from province_code
    scope_area_id = None
    if government_level == "PROVINCIAL" and province_code:
        province_au = _get_area_by_code(db, province_code)
        if province_au is None or province_au.category != "PROVINCE":
            raise ElectionServiceError(
                f"Province code '{province_code}' not found in area_units. "
                "Ensure geography data has been seeded."
            )
        scope_area_id = province_au.id

    election = Election(
        title=title,
        description=description,
        election_type=government_level,  # keep legacy column populated
        government_level=government_level,
        election_subtype=election_subtype,
        province_code=province_code,
        scope_area_id=scope_area_id,
        status="DRAFT",
        start_time=start_time,
        end_time=end_time,
        created_by=created_by,
    )
    election_repository.create(db, election)
    db.commit()
    db.refresh(election)
    return election


def update_election(
    db: Session,
    election: Election,
    *,
    title: str | None = None,
    description: str | None = ...,
    start_time=None,
    end_time=None,
) -> Election:
    _require_status(election, EDITABLE_STATUSES, "edit election")

    if title is not None:
        election.title = title
    if description is not ...:
        election.description = description
    if start_time is not None:
        election.start_time = start_time
    if end_time is not None:
        election.end_time = end_time

    effective_start = start_time or election.start_time
    effective_end = end_time or election.end_time
    if effective_end <= effective_start:
        raise ElectionServiceError("end_time must be after start_time")

    db.commit()
    db.refresh(election)
    return election


DELETABLE_STATUSES = (
    "DRAFT",
    "CONFIGURED",
    "NOMINATIONS_OPEN",
    "NOMINATIONS_CLOSED",
    "CANDIDATE_LIST_PUBLISHED",
    "ARCHIVED",
)


def delete_election(db: Session, election: Election) -> None:
    _require_status(election, DELETABLE_STATUSES, "delete election")
    _cascade_delete_election_data(db, election.id)
    election_repository.delete_contests(db, election.id)
    election_repository.delete(db, election)
    db.commit()


def _cascade_delete_election_data(db: Session, election_id: int) -> None:
    """Remove all dependent data for an election before contests/election are deleted.

    Deletion order follows FK dependency depth (deepest first):
      pr_result_rows → fptp_result_rows → pr_party_list_entries →
      ballot_entries → count_runs → ballots → votes →
      fptp_candidate_nominations → pr_party_submissions
    """
    from app.models.ballot import Ballot
    from app.models.ballot_entry import BallotEntry
    from app.models.count_run import CountRun
    from app.models.fptp_candidate_nomination import FptpCandidateNomination
    from app.models.fptp_result_row import FptpResultRow
    from app.models.pr_elected_member import PrElectedMember
    from app.models.pr_party_list_entry import PrPartyListEntry
    from app.models.pr_party_submission import PrPartySubmission
    from app.models.pr_result_row import PrResultRow

    # 1. pr_elected_members, pr_result_rows, fptp_result_rows (via count_runs)
    count_run_ids = list(db.execute(
        select(CountRun.id).where(CountRun.election_id == election_id)
    ).scalars().all())
    if count_run_ids:
        db.execute(
            PrElectedMember.__table__.delete().where(PrElectedMember.count_run_id.in_(count_run_ids))
        )
        db.execute(
            PrResultRow.__table__.delete().where(PrResultRow.count_run_id.in_(count_run_ids))
        )
        db.execute(
            FptpResultRow.__table__.delete().where(FptpResultRow.count_run_id.in_(count_run_ids))
        )

    # 2. pr_party_list_entries (via pr_party_submissions)
    submission_ids = list(db.execute(
        select(PrPartySubmission.id).where(PrPartySubmission.election_id == election_id)
    ).scalars().all())
    if submission_ids:
        db.execute(
            PrPartyListEntry.__table__.delete().where(
                PrPartyListEntry.submission_id.in_(submission_ids)
            )
        )

    # 3. ballot_entries (via ballots)
    ballot_ids = list(db.execute(
        select(Ballot.id).where(Ballot.election_id == election_id)
    ).scalars().all())
    if ballot_ids:
        db.execute(
            BallotEntry.__table__.delete().where(BallotEntry.ballot_id.in_(ballot_ids))
        )

    # 4. count_runs
    if count_run_ids:
        db.execute(
            CountRun.__table__.delete().where(CountRun.election_id == election_id)
        )

    # 5. ballots
    if ballot_ids:
        db.execute(
            Ballot.__table__.delete().where(Ballot.election_id == election_id)
        )

    # 7. fptp_candidate_nominations
    db.execute(
        FptpCandidateNomination.__table__.delete().where(
            FptpCandidateNomination.election_id == election_id
        )
    )

    # 8. pr_party_submissions
    if submission_ids:
        db.execute(
            PrPartySubmission.__table__.delete().where(
                PrPartySubmission.election_id == election_id
            )
        )

    db.flush()


# ── Universal structure generation (dispatches by level/subtype) ──


def generate_election_structure(db: Session, election: Election) -> dict:
    """Generate contest structure for any supported election type.

    Dispatches to the correct generator based on government_level + election_subtype.
    This is the new universal entry point.
    """
    _require_status(election, STRUCTURE_GEN_STATUSES, "generate structure")

    existing = election_repository.count_contests(db, election.id)
    if sum(existing.values()) > 0:
        raise ElectionServiceError(
            "Contests already exist for this election. Delete them first or create a new election."
        )

    struct_def = get_structure_def(election.government_level, election.election_subtype)
    if struct_def is None:
        raise ElectionServiceError(
            f"Structure generation not supported for "
            f"{election.government_level}/{election.election_subtype}"
        )

    # Dispatch to level-specific generators
    key = (election.government_level, election.election_subtype)
    if key == ("FEDERAL", "HOR_DIRECT"):
        return _generate_federal_hor(db, election)
    elif key == ("PROVINCIAL", "PROVINCIAL_ASSEMBLY"):
        return _generate_provincial_assembly(db, election)
    elif key[0] == "LOCAL":
        return _generate_local(db, election)
    else:
        raise ElectionServiceError(
            f"No generator implemented for {election.government_level}/{election.election_subtype}"
        )


# ── Backward-compatible alias ───────────────────────────────────

def generate_federal_hor_structure(db: Session, election: Election) -> dict:
    """Backward-compatible: delegates to the universal generator."""
    return generate_election_structure(db, election)


# ── Federal HoR generator ──────────────────────────────────────


def _generate_federal_hor(db: Session, election: Election) -> dict:
    """Generate 165 FPTP + 1 PR contests for a Federal HoR election."""
    # Verify constituency master data
    constituency_count = db.execute(
        select(func.count()).select_from(Constituency)
    ).scalar_one()

    if constituency_count < FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT:
        raise ElectionServiceError(
            f"Need {FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT} constituencies, "
            f"found {constituency_count}. Seed geography data first."
        )

    # Load constituencies + their matching area_units
    constituencies = list(
        db.execute(
            select(Constituency).order_by(Constituency.id)
        ).scalars().all()
    )
    fptp_constituencies = constituencies[:FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT]

    # Build code → area_unit.id mapping
    area_map = _get_area_map(db, "CONSTITUENCY")

    # Create FPTP contests
    for c in fptp_constituencies:
        contest = ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_FPTP,
            title=f"FPTP – {c.name}",
            seat_count=FPTP_SEATS_PER_CONSTITUENCY,
            constituency_id=c.id,
            area_id=area_map.get(c.code),
        )
        db.add(contest)

    # PR national contest
    np_area = _get_area_by_code(db, "NP")
    pr_contest = ElectionContest(
        election_id=election.id,
        contest_type=CONTEST_TYPE_PR,
        title="PR – National Proportional Representation",
        seat_count=FEDERAL_HOR_PR_SEATS,
        constituency_id=None,
        area_id=np_area.id if np_area else None,
    )
    db.add(pr_contest)

    db.commit()

    return {
        "fptp_contests_created": FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        "pr_contests_created": 1,
        "total_contests": FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT + 1,
    }


# ── Provincial Assembly generator ──────────────────────────────


def _generate_provincial_assembly(db: Session, election: Election) -> dict:
    """Generate FPTP + PR contests for a single-province Provincial Assembly election.

    One FPTP contest per federal CONSTITUENCY area_unit in the province, plus one
    province-wide PR contest whose seat_count equals the FPTP count (per Nepal
    Constitution Article 176).

    The election's scope_area_id is set to the province area_unit id so the election
    is formally linked to its province geography.
    """
    if not election.province_code:
        raise ElectionServiceError(
            "Cannot generate structure: election.province_code is not set. "
            "A provincial election must be scoped to a specific province (e.g. 'P1')."
        )

    # Fetch the province area_unit
    province = _get_area_by_code(db, election.province_code)
    if province is None or province.category != "PROVINCE":
        raise ElectionServiceError(
            f"Province code '{election.province_code}' not found in area_units. "
            "Ensure area_unit data has been seeded."
        )

    if province.province_number is None:
        raise ElectionServiceError(
            f"Province '{election.province_code}' has no province_number set in area_units."
        )

    prov_num = province.province_number

    # Wire scope_area_id so the election is formally linked to its province
    if election.scope_area_id is None:
        election.scope_area_id = province.id

    # Look up expected PR seat count from provincial constants
    pr_seat_count = PROVINCIAL_PR_SEATS.get(prov_num)
    if pr_seat_count is None:
        raise ElectionServiceError(
            f"No PR seat count defined for province_number={prov_num}. "
            "Check provincial_constants.py."
        )

    # Fetch all CONSTITUENCY area_units that belong to this province
    constituencies = list(
        db.execute(
            select(AreaUnit)
            .where(
                AreaUnit.category == "CONSTITUENCY",
                AreaUnit.province_number == prov_num,
            )
            .order_by(AreaUnit.code)
        ).scalars().all()
    )

    expected_fptp = EXPECTED_PROVINCE_CONSTITUENCY_COUNTS.get(prov_num, 0)
    if len(constituencies) != expected_fptp:
        raise ElectionServiceError(
            f"Province {prov_num}: expected {expected_fptp} constituencies in area_units "
            f"but found {len(constituencies)}. Seed/fix geography data first."
        )

    if not constituencies:
        raise ElectionServiceError(
            f"No constituency area_units found for province '{election.province_code}' "
            f"(province_number={prov_num}). Seed geography data first."
        )

    # Create one FPTP contest per constituency in the province
    for c in constituencies:
        db.add(ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_FPTP,
            title=f"Provincial FPTP – {c.name}",
            seat_count=FPTP_SEATS_PER_CONSTITUENCY,
            area_id=c.id,
        ))

    # Create one province-wide PR contest with correct seat count
    db.add(ElectionContest(
        election_id=election.id,
        contest_type=CONTEST_TYPE_PR,
        title=f"Provincial PR – {province.name}",
        seat_count=pr_seat_count,
        area_id=province.id,
    ))

    db.commit()

    return {
        "fptp_contests_created": len(constituencies),
        "pr_contests_created": 1,
        "pr_seat_count": pr_seat_count,
        "total_contests": len(constituencies) + 1,
    }


# ── Local election generator ───────────────────────────────────


def _generate_local(db: Session, election: Election) -> dict:
    """Generate local body election contests.

    LOCAL_MUNICIPAL (urban): Mayor + Deputy Mayor per MUNICIPALITY/METROPOLITAN/SUB_METROPOLITAN
    LOCAL_RURAL: Chairperson + Vice Chairperson per RURAL_MUNICIPALITY

    Per ward (both urban and rural): 4 contests:
      - WARD_CHAIR (seat_count=1)
      - WARD_WOMAN_MEMBER (seat_count=1)
      - WARD_DALIT_WOMAN (seat_count=1)
      - WARD_MEMBER_OPEN (seat_count=2, elects 2 members)

    Total selections per voter: 2 head + 5 ward positions = 7 FPTP selections.

    Ward data is REQUIRED. If no wards exist for any targeted local body,
    generation fails — the admin must seed wards before generating structure.
    """
    from app.core.election_constants import (
        CONTEST_TYPE_MAYOR,
        CONTEST_TYPE_DEPUTY_MAYOR,
        CONTEST_TYPE_WARD_CHAIR,
        CONTEST_TYPE_WARD_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_MEMBER_OPEN,
        URBAN_LOCAL_BODY_CATEGORIES,
        RURAL_LOCAL_BODY_CATEGORIES,
    )

    # Determine which local body categories to target
    if election.election_subtype == "LOCAL_RURAL":
        target_categories = RURAL_LOCAL_BODY_CATEGORIES
    else:
        target_categories = URBAN_LOCAL_BODY_CATEGORIES

    local_bodies = list(
        db.execute(
            select(AreaUnit)
            .where(AreaUnit.category.in_(target_categories))
            .order_by(AreaUnit.code)
        ).scalars().all()
    )

    if not local_bodies:
        raise ElectionServiceError(
            f"No local bodies found in area_units for categories {target_categories}. "
            "Seed area unit data first."
        )

    # Collect local body codes to find their wards
    lb_codes = [lb.code for lb in local_bodies]

    # Find wards belonging to these local bodies
    wards = list(
        db.execute(
            select(AreaUnit)
            .where(
                AreaUnit.category == "WARD",
                AreaUnit.parent_code.in_(lb_codes),
            )
            .order_by(AreaUnit.parent_code, AreaUnit.ward_number)
        ).scalars().all()
    )

    if not wards:
        raise ElectionServiceError(
            "No ward data found in area_units for the targeted local bodies. "
            "Local elections require ward master data (nepal_ward_data.json). "
            "Seed ward data first, then re-generate structure."
        )

    # Group wards by parent local body code
    wards_by_lb: dict[str, list] = {}
    for w in wards:
        wards_by_lb.setdefault(w.parent_code, []).append(w)

    # Verify every local body has at least one ward
    bodies_without_wards = [lb.code for lb in local_bodies if lb.code not in wards_by_lb]
    if bodies_without_wards:
        raise ElectionServiceError(
            f"{len(bodies_without_wards)} local body/bodies have no wards in area_units. "
            f"First few: {bodies_without_wards[:5]}. "
            "Seed complete ward data before generating local election structure."
        )

    is_rural = election.election_subtype == "LOCAL_RURAL"

    mayor_created = 0
    deputy_created = 0
    ward_chair_created = 0
    ward_woman_created = 0
    ward_dalit_woman_created = 0
    ward_open_created = 0

    for lb in local_bodies:
        head_title = f"Chairperson – {lb.name}" if is_rural else f"Mayor – {lb.name}"
        deputy_title = f"Vice Chairperson – {lb.name}" if is_rural else f"Deputy Mayor – {lb.name}"

        db.add(ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_MAYOR,
            title=head_title,
            seat_count=1,
            area_id=lb.id,
        ))
        mayor_created += 1

        db.add(ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_DEPUTY_MAYOR,
            title=deputy_title,
            seat_count=1,
            area_id=lb.id,
        ))
        deputy_created += 1

        for ward in wards_by_lb[lb.code]:
            db.add(ElectionContest(
                election_id=election.id,
                contest_type=CONTEST_TYPE_WARD_CHAIR,
                title=f"Ward Chairperson – {ward.name}",
                seat_count=1,
                area_id=ward.id,
            ))
            ward_chair_created += 1

            db.add(ElectionContest(
                election_id=election.id,
                contest_type=CONTEST_TYPE_WARD_WOMAN_MEMBER,
                title=f"Woman Ward Member – {ward.name}",
                seat_count=1,
                area_id=ward.id,
            ))
            ward_woman_created += 1

            db.add(ElectionContest(
                election_id=election.id,
                contest_type=CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
                title=f"Dalit Woman Ward Member – {ward.name}",
                seat_count=1,
                area_id=ward.id,
            ))
            ward_dalit_woman_created += 1

            db.add(ElectionContest(
                election_id=election.id,
                contest_type=CONTEST_TYPE_WARD_MEMBER_OPEN,
                title=f"Open Ward Member – {ward.name}",
                seat_count=2,
                area_id=ward.id,
            ))
            ward_open_created += 1

    db.commit()

    total_ward_contests = (
        ward_chair_created + ward_woman_created
        + ward_dalit_woman_created + ward_open_created
    )

    return {
        "fptp_contests_created": 0,
        "pr_contests_created": 0,
        "mayor_contests_created": mayor_created,
        "deputy_mayor_contests_created": deputy_created,
        "ward_chair_contests_created": ward_chair_created,
        "ward_woman_member_contests_created": ward_woman_created,
        "ward_dalit_woman_member_contests_created": ward_dalit_woman_created,
        "ward_member_open_contests_created": ward_open_created,
        "total_ward_contests": total_ward_contests,
        "total_contests": mayor_created + deputy_created + total_ward_contests,
        "local_bodies": len(local_bodies),
        "wards": len(wards),
    }


# ── Readiness checks (multi-level) ─────────────────────────────


def check_structure_readiness(db: Session, election: Election) -> dict:
    """Check if an election's structure is ready for configuration.

    Dispatches readiness checks by (government_level, election_subtype).
    """
    issues: list[str] = []

    contest_counts = election_repository.count_contests(db, election.id)
    total_contests = sum(contest_counts.values())
    fptp = contest_counts.get(CONTEST_TYPE_FPTP, 0)
    pr = contest_counts.get(CONTEST_TYPE_PR, 0)

    key = (election.government_level, election.election_subtype)

    if key == ("FEDERAL", "HOR_DIRECT"):
        issues.extend(_check_federal_hor_readiness(db, fptp, pr))
    elif key == ("PROVINCIAL", "PROVINCIAL_ASSEMBLY"):
        issues.extend(_check_provincial_readiness(db, election, fptp, pr))
    elif key[0] == "LOCAL":
        issues.extend(_check_local_readiness(db, election, contest_counts))
    else:
        struct_def = get_structure_def(election.government_level, election.election_subtype)
        if struct_def is None:
            issues.append(
                f"Unknown election type: {election.government_level}/{election.election_subtype}"
            )
        elif total_contests == 0:
            issues.append("No contests have been generated")

    return {
        "ready": len(issues) == 0,
        "issues": issues,
        "fptp_contests": fptp,
        "pr_contests": pr,
        "total_contests": total_contests,
        "contest_counts": contest_counts,
        "total_constituencies": db.execute(
            select(func.count()).select_from(Constituency)
        ).scalar_one(),
    }


def _check_federal_hor_readiness(db: Session, fptp: int, pr: int) -> list[str]:
    """Federal HoR specific readiness checks."""
    issues = []
    if fptp != FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT:
        issues.append(
            f"Expected {FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT} FPTP contests, found {fptp}"
        )
    if pr != 1:
        issues.append(f"Expected 1 PR contest, found {pr}")
    return issues


def _check_provincial_readiness(db: Session, election: Election, fptp: int, pr: int) -> list[str]:
    """Provincial Assembly specific readiness checks.

    Hard requirements (any failure blocks CONFIGURED transition):
    - province_code and scope_area_id must be set
    - FPTP count must match EXPECTED_PROVINCE_CONSTITUENCY_COUNTS
    - Exactly 1 PR contest
    - PR seat_count must match PROVINCIAL_PR_SEATS (no zeros allowed)
    - No duplicate area_id among FPTP contests
    - All contest titles must be non-empty
    """
    issues = []

    # ── Province identity checks ──────────────────────────────
    if not election.province_code:
        issues.append(
            "Election is missing province_code — cannot determine expected contest counts"
        )
        return issues

    if election.scope_area_id is None:
        issues.append(
            "Election is missing scope_area_id — province link was not wired at creation"
        )

    province = _get_area_by_code(db, election.province_code)
    if province is None:
        issues.append(f"Province '{election.province_code}' not found in area_units")
        return issues

    prov_num = province.province_number

    # ── FPTP count check ──────────────────────────────────────
    expected_fptp = EXPECTED_PROVINCE_CONSTITUENCY_COUNTS.get(prov_num, 0)
    if fptp != expected_fptp:
        issues.append(
            f"Expected {expected_fptp} FPTP contests for province {prov_num}, found {fptp}"
        )

    # ── PR count & seat_count check ───────────────────────────
    if pr != 1:
        issues.append(f"Expected exactly 1 provincial PR contest, found {pr}")

    if pr >= 1:
        pr_contest = db.execute(
            select(ElectionContest)
            .where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == CONTEST_TYPE_PR,
            )
        ).scalar_one_or_none()

        if pr_contest is not None:
            expected_pr_seats = PROVINCIAL_PR_SEATS.get(prov_num, 0)
            if pr_contest.seat_count != expected_pr_seats:
                issues.append(
                    f"Provincial PR seat_count is {pr_contest.seat_count}, "
                    f"expected {expected_pr_seats} (per Constitution Article 176)"
                )
            if pr_contest.seat_count == 0:
                issues.append("Provincial PR contest has seat_count=0 — cannot configure")

    # ── Duplicate area check among FPTP contests ──────────────
    fptp_area_ids = [
        row[0]
        for row in db.execute(
            select(ElectionContest.area_id)
            .where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            )
        ).all()
    ]
    if len(fptp_area_ids) != len(set(fptp_area_ids)):
        issues.append("Duplicate area_id detected among FPTP contests")

    # ── Title completeness check ──────────────────────────────
    empty_title_count = db.execute(
        select(func.count())
        .select_from(ElectionContest)
        .where(
            ElectionContest.election_id == election.id,
            (ElectionContest.title == None) | (ElectionContest.title == ""),  # noqa: E711
        )
    ).scalar_one()
    if empty_title_count > 0:
        issues.append(f"{empty_title_count} contest(s) have empty or missing titles")

    return issues


def _check_local_readiness(
    db: Session, election: Election, contest_counts: dict[str, int],
) -> list[str]:
    """Local election readiness checks.

    Requirements (all must pass):
    1. Ward data must exist in area_units
    2. Mayor/Chair and Deputy/Vice counts must match expected local body count
    3. Mayor and Deputy counts must be equal
    4. Each ward contest type count must equal total ward count
    5. WARD_MEMBER_OPEN contests must have seat_count=2
    6. No duplicate (contest_type, area_id) pairs
    7. All contest titles must be non-empty
    """
    from app.core.election_constants import (
        CONTEST_TYPE_MAYOR,
        CONTEST_TYPE_DEPUTY_MAYOR,
        CONTEST_TYPE_WARD_CHAIR,
        CONTEST_TYPE_WARD_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_MEMBER_OPEN,
        URBAN_LOCAL_BODY_CATEGORIES,
        RURAL_LOCAL_BODY_CATEGORIES,
    )

    issues: list[str] = []

    # ── 1. Determine targeted categories and expected counts ──
    if election.election_subtype == "LOCAL_RURAL":
        expected_categories = RURAL_LOCAL_BODY_CATEGORIES
    else:
        expected_categories = URBAN_LOCAL_BODY_CATEGORIES

    expected_body_count = db.execute(
        select(func.count())
        .select_from(AreaUnit)
        .where(AreaUnit.category.in_(expected_categories))
    ).scalar_one()

    # Count wards belonging to targeted local bodies
    lb_codes = [
        row[0] for row in db.execute(
            select(AreaUnit.code).where(AreaUnit.category.in_(expected_categories))
        ).all()
    ]
    expected_ward_count = db.execute(
        select(func.count())
        .select_from(AreaUnit)
        .where(
            AreaUnit.category == "WARD",
            AreaUnit.parent_code.in_(lb_codes) if lb_codes else AreaUnit.parent_code == "__none__",
        )
    ).scalar_one() if lb_codes else 0

    # ── 2. Ward data required ──
    if expected_ward_count == 0:
        issues.append(
            "No ward data in area_units for targeted local bodies. "
            "Local elections require ward master data (nepal_ward_data.json). "
            "Seed ward data and re-generate structure."
        )
        return issues  # No point checking further

    # ── 3. Head contest counts ──
    mayor_count = contest_counts.get(CONTEST_TYPE_MAYOR, 0)
    deputy_count = contest_counts.get(CONTEST_TYPE_DEPUTY_MAYOR, 0)

    if mayor_count == 0:
        issues.append("No Mayor/Chairperson contests generated")
    if deputy_count == 0:
        issues.append("No Deputy Mayor/Vice Chairperson contests generated")
    if mayor_count != deputy_count:
        issues.append(
            f"Mayor ({mayor_count}) and Deputy ({deputy_count}) counts don't match"
        )
    if mayor_count != expected_body_count:
        issues.append(
            f"Expected {expected_body_count} head contests for "
            f"{election.election_subtype}, found {mayor_count}"
        )

    # ── 4. Ward contest counts (4 types, each must equal total ward count) ──
    ward_chair = contest_counts.get(CONTEST_TYPE_WARD_CHAIR, 0)
    ward_woman = contest_counts.get(CONTEST_TYPE_WARD_WOMAN_MEMBER, 0)
    ward_dalit = contest_counts.get(CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER, 0)
    ward_open = contest_counts.get(CONTEST_TYPE_WARD_MEMBER_OPEN, 0)

    ward_type_counts = {
        "WARD_CHAIR": ward_chair,
        "WARD_WOMAN_MEMBER": ward_woman,
        "WARD_DALIT_WOMAN": ward_dalit,
        "WARD_MEMBER_OPEN": ward_open,
    }

    for type_name, count in ward_type_counts.items():
        if count != expected_ward_count:
            issues.append(
                f"{type_name}: expected {expected_ward_count} contests "
                f"(1 per ward), found {count}"
            )

    # ── 5. Verify WARD_MEMBER_OPEN seat_count=2 ──
    if ward_open > 0:
        bad_seat_count = db.execute(
            select(func.count())
            .select_from(ElectionContest)
            .where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == CONTEST_TYPE_WARD_MEMBER_OPEN,
                ElectionContest.seat_count != 2,
            )
        ).scalar_one()
        if bad_seat_count > 0:
            issues.append(
                f"{bad_seat_count} WARD_MEMBER_OPEN contest(s) have wrong seat_count "
                f"(expected 2 for all)"
            )

    # ── 6. Duplicate (contest_type, area_id) check ──
    dup_count = db.execute(
        select(func.count()).select_from(
            select(
                ElectionContest.contest_type,
                ElectionContest.area_id,
            )
            .where(ElectionContest.election_id == election.id)
            .group_by(ElectionContest.contest_type, ElectionContest.area_id)
            .having(func.count() > 1)
            .subquery()
        )
    ).scalar_one()
    if dup_count > 0:
        issues.append(
            f"{dup_count} duplicate (contest_type, area_id) pair(s) detected"
        )

    # ── 7. Title completeness ──
    empty_title_count = db.execute(
        select(func.count())
        .select_from(ElectionContest)
        .where(
            ElectionContest.election_id == election.id,
            (ElectionContest.title == None) | (ElectionContest.title == ""),  # noqa: E711
        )
    ).scalar_one()
    if empty_title_count > 0:
        issues.append(f"{empty_title_count} contest(s) have empty or missing titles")

    # ── Summary context (appended even if ready, for admin info) ──
    expected_total = (2 * expected_body_count) + (4 * expected_ward_count)
    actual_total = sum(contest_counts.values())
    if actual_total != expected_total and not issues:
        issues.append(
            f"Total contest count mismatch: expected {expected_total} "
            f"(2×{expected_body_count} head + 4×{expected_ward_count} ward), "
            f"found {actual_total}"
        )

    return issues


# ── Configure / lock setup ─────────────────────────────────────

def configure_election(db: Session, election: Election) -> Election:
    """Transition DRAFT → CONFIGURED after readiness passes."""
    _require_status(election, CONFIGURABLE_STATUSES, "configure election")

    readiness = check_structure_readiness(db, election)
    if not readiness["ready"]:
        raise ElectionServiceError(
            "Cannot configure: structure readiness check failed — "
            + "; ".join(readiness["issues"])
        )

    election.status = "CONFIGURED"
    db.commit()
    db.refresh(election)
    return election


# ── Lifecycle transitions ───────────────────────────────────────

# The following transitions are manually triggered by an admin.
# POLLING_CLOSED→COUNTING and COUNTING→FINALIZED are automatic via count_service.
ALLOWED_TRANSITIONS: dict[str, str] = {
    "CONFIGURED": "NOMINATIONS_OPEN",
    "NOMINATIONS_OPEN": "NOMINATIONS_CLOSED",
    "NOMINATIONS_CLOSED": "CANDIDATE_LIST_PUBLISHED",
    "CANDIDATE_LIST_PUBLISHED": "POLLING_OPEN",
    "POLLING_OPEN": "POLLING_CLOSED",
    "FINALIZED": "ARCHIVED",
}

# Lifecycle timestamp fields to set when entering a new status
_TIMESTAMP_FOR_STATUS: dict[str, str] = {
    "NOMINATIONS_OPEN": "nomination_open_at",
    "NOMINATIONS_CLOSED": "nomination_close_at",
    "CANDIDATE_LIST_PUBLISHED": "candidate_list_publish_at",
    "POLLING_OPEN": "polling_start_at",
    "POLLING_CLOSED": "polling_end_at",
}


def advance_election_status(db: Session, election: Election) -> Election:
    """Advance an election to its next lifecycle status.

    Uses ALLOWED_TRANSITIONS to determine the valid next state.
    Automatically sets the corresponding lifecycle timestamp.
    """
    current = election.status
    next_status = ALLOWED_TRANSITIONS.get(current)
    if next_status is None:
        raise ElectionServiceError(
            f"Cannot advance: no manual transition from '{current}'. "
            f"Allowed transitions: {list(ALLOWED_TRANSITIONS.keys())}"
        )

    now = datetime.now(timezone.utc)

    # Set lifecycle timestamp if applicable
    ts_field = _TIMESTAMP_FOR_STATUS.get(next_status)
    if ts_field:
        setattr(election, ts_field, now)

    election.status = next_status
    db.commit()
    db.refresh(election)
    return election


# ── Area unit helpers ───────────────────────────────────────────


def _get_area_map(db: Session, category: str) -> dict[str, int]:
    """Return {code: area_unit.id} for all area_units of a given category."""
    rows = db.execute(
        select(AreaUnit.code, AreaUnit.id).where(AreaUnit.category == category)
    ).all()
    return {code: aid for code, aid in rows}


def _get_area_by_code(db: Session, code: str) -> AreaUnit | None:
    """Get a single area_unit by its code."""
    return db.execute(
        select(AreaUnit).where(AreaUnit.code == code)
    ).scalar_one_or_none()


# ── Master data status (multi-level) ───────────────────────────


def get_master_data_status(db: Session) -> dict:
    """Return geography master data counts for all levels."""
    from app.models.district import District
    from app.core.geography_loader import (
        ward_data_available,
        EXPECTED_TOTAL_LOCAL_BODIES,
        EXPECTED_URBAN_LOCAL_BODIES,
        EXPECTED_RURAL_LOCAL_BODIES,
        EXPECTED_WARD_COUNT,
    )

    district_count = db.execute(
        select(func.count()).select_from(District)
    ).scalar_one()
    constituency_count = db.execute(
        select(func.count()).select_from(Constituency)
    ).scalar_one()

    # Area unit counts by category
    area_counts_rows = db.execute(
        select(AreaUnit.category, func.count(AreaUnit.id))
        .group_by(AreaUnit.category)
    ).all()
    area_counts = {cat: cnt for cat, cnt in area_counts_rows}

    total_local = sum(
        area_counts.get(c, 0) for c in LOCAL_BODY_CATEGORIES
    )
    ward_count = area_counts.get("WARD", 0)

    # Province list for frontend province selector
    province_rows = db.execute(
        select(AreaUnit.code, AreaUnit.name)
        .where(AreaUnit.category == "PROVINCE")
        .order_by(AreaUnit.code)
    ).all()
    province_list = [{"code": row.code, "name": row.name} for row in province_rows]

    return {
        # Backward-compatible fields (used by frontend-admin)
        "districts": district_count,
        "constituencies": constituency_count,
        "required_constituencies": FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        "ready": constituency_count >= FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        # New multi-level fields
        "provinces": area_counts.get("PROVINCE", 0),
        "local_bodies": total_local,
        "wards": ward_count,
        "ward_data_available": ward_data_available(),
        "expected_wards": EXPECTED_WARD_COUNT,
        "expected_local_bodies": EXPECTED_TOTAL_LOCAL_BODIES,
        "expected_urban_local_bodies": EXPECTED_URBAN_LOCAL_BODIES,
        "expected_rural_local_bodies": EXPECTED_RURAL_LOCAL_BODIES,
        "area_units_total": sum(area_counts.values()),
        "area_counts": area_counts,
        "federal_ready": constituency_count >= FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        "provincial_ready": area_counts.get("PROVINCE", 0) == 7,
        "local_ready": total_local >= EXPECTED_TOTAL_LOCAL_BODIES,
        "local_wards_ready": ward_count >= EXPECTED_WARD_COUNT,
        "province_list": province_list,
    }
