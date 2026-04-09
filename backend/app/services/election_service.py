"""Election management service — CRUD, structure generation, readiness checks.

Business rules enforced here:
- Structure generation dispatches by (government_level, election_subtype)
- Federal HoR: 165 FPTP + 1 PR contest atomically
- Provincial Assembly: FPTP + PR per province (placeholder)
- Local: Mayor + Deputy Mayor per local body
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

    election = Election(
        title=title,
        description=description,
        election_type=government_level,  # keep legacy column populated
        government_level=government_level,
        election_subtype=election_subtype,
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


DELETABLE_STATUSES = ("DRAFT", "ARCHIVED")


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
    from app.models.pr_party_list_entry import PrPartyListEntry
    from app.models.pr_party_submission import PrPartySubmission
    from app.models.pr_result_row import PrResultRow

    # 1. pr_result_rows (via count_runs)
    count_run_ids = list(db.execute(
        select(CountRun.id).where(CountRun.election_id == election_id)
    ).scalars().all())
    if count_run_ids:
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

    # 6. legacy votes (if any)
    try:
        from app.models.vote import Vote
        db.execute(
            Vote.__table__.delete().where(Vote.election_id == election_id)
        )
    except Exception:
        pass  # vote table may not exist

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
    """Generate PR contests per province for a Provincial Assembly election.

    Provincial constituency FPTP data is not yet available in the canonical JSON.
    For now, generates 1 PR contest per province (7 total).
    FPTP generation will be added when provincial constituency data is available.
    """
    provinces = list(
        db.execute(
            select(AreaUnit)
            .where(AreaUnit.category == "PROVINCE")
            .order_by(AreaUnit.code)
        ).scalars().all()
    )

    if len(provinces) != 7:
        raise ElectionServiceError(
            f"Expected 7 provinces in area_units, found {len(provinces)}. "
            "Seed area unit data first."
        )

    pr_created = 0
    for prov in provinces:
        contest = ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_PR,
            title=f"Provincial PR – {prov.name}",
            seat_count=0,  # seat counts vary by province; set later
            area_id=prov.id,
        )
        db.add(contest)
        pr_created += 1

    db.commit()

    return {
        "fptp_contests_created": 0,
        "pr_contests_created": pr_created,
        "total_contests": pr_created,
    }


# ── Local election generator ───────────────────────────────────


def _generate_local(db: Session, election: Election) -> dict:
    """Generate Mayor + Deputy Mayor contests for local body elections.

    Creates one MAYOR and one DEPUTY_MAYOR contest per local body
    (municipality, rural municipality, metropolitan, sub-metropolitan).
    """
    from app.core.election_constants import CONTEST_TYPE_MAYOR, CONTEST_TYPE_DEPUTY_MAYOR

    # Determine which local body categories to target
    if election.election_subtype == "LOCAL_RURAL":
        target_categories = ("RURAL_MUNICIPALITY",)
    else:
        # LOCAL_MUNICIPAL: all local body types
        target_categories = LOCAL_BODY_CATEGORIES

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

    mayor_created = 0
    deputy_created = 0

    for lb in local_bodies:
        # Mayor / Chair
        db.add(ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_MAYOR,
            title=f"Mayor – {lb.name}" if lb.category != "RURAL_MUNICIPALITY" else f"Chair – {lb.name}",
            seat_count=1,
            area_id=lb.id,
        ))
        mayor_created += 1

        # Deputy Mayor / Vice Chair
        db.add(ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_DEPUTY_MAYOR,
            title=f"Deputy Mayor – {lb.name}" if lb.category != "RURAL_MUNICIPALITY" else f"Vice Chair – {lb.name}",
            seat_count=1,
            area_id=lb.id,
        ))
        deputy_created += 1

    db.commit()

    return {
        "fptp_contests_created": 0,
        "pr_contests_created": 0,
        "mayor_contests_created": mayor_created,
        "deputy_mayor_contests_created": deputy_created,
        "total_contests": mayor_created + deputy_created,
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
        if pr < 7:
            issues.append(f"Expected at least 7 provincial PR contests, found {pr}")
    elif key[0] == "LOCAL":
        from app.core.election_constants import CONTEST_TYPE_MAYOR, CONTEST_TYPE_DEPUTY_MAYOR
        mayor_count = contest_counts.get(CONTEST_TYPE_MAYOR, 0)
        deputy_count = contest_counts.get(CONTEST_TYPE_DEPUTY_MAYOR, 0)
        if mayor_count == 0:
            issues.append("No Mayor/Chair contests generated")
        if deputy_count == 0:
            issues.append("No Deputy Mayor/Vice Chair contests generated")
        if mayor_count != deputy_count:
            issues.append(
                f"Mayor ({mayor_count}) and Deputy Mayor ({deputy_count}) contest counts don't match"
            )
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

    return {
        # Backward-compatible fields (used by frontend-admin)
        "districts": district_count,
        "constituencies": constituency_count,
        "required_constituencies": FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        "ready": constituency_count >= FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        # New multi-level fields
        "provinces": area_counts.get("PROVINCE", 0),
        "local_bodies": total_local,
        "area_units_total": sum(area_counts.values()),
        "area_counts": area_counts,
        "federal_ready": constituency_count >= FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        "provincial_ready": area_counts.get("PROVINCE", 0) == 7,
        "local_ready": total_local > 0,
    }
