"""Election management service — CRUD, structure generation, readiness checks.

Business rules enforced here:
- Federal HoR elections expand to 165 FPTP + 1 PR contest atomically
- Generation blocked unless constituency master data is sufficient
- Only DRAFT elections may have structure generated or be edited/deleted
- Configure (DRAFT→CONFIGURED) blocked unless structure passes readiness
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.federal_constants import (
    CONTEST_TYPE_FPTP,
    CONTEST_TYPE_PR,
    FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
    FEDERAL_HOR_PR_SEATS,
    FPTP_SEATS_PER_CONSTITUENCY,
)
from app.models.constituency import Constituency
from app.models.election import Election, ELECTION_STATUS_VALUES
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


def delete_election(db: Session, election: Election) -> None:
    _require_status(election, EDITABLE_STATUSES, "delete election")
    election_repository.delete_contests(db, election.id)
    election_repository.delete(db, election)
    db.commit()


# ── Federal structure generation ────────────────────────────────

def generate_federal_hor_structure(db: Session, election: Election) -> dict:
    """Atomically generate 165 FPTP + 1 PR contests for a federal HoR election.

    Pre-conditions:
    * election.status must be DRAFT
    * election.government_level must be FEDERAL
    * election.election_subtype must be HOR_DIRECT
    * no contests must already exist for this election
    * exactly 165 constituencies must exist in the districts/constituencies tables
    """
    _require_status(election, STRUCTURE_GEN_STATUSES, "generate structure")

    if election.government_level != "FEDERAL" or election.election_subtype != "HOR_DIRECT":
        raise ElectionServiceError(
            "Structure generation is only supported for FEDERAL / HOR_DIRECT elections"
        )

    existing = election_repository.count_contests(db, election.id)
    if sum(existing.values()) > 0:
        raise ElectionServiceError(
            "Contests already exist for this election. Delete them first or create a new election."
        )

    # Verify constituency master data
    constituency_count = db.execute(
        select(func.count()).select_from(Constituency)
    ).scalar_one()

    if constituency_count < FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT:
        raise ElectionServiceError(
            f"Need exactly {FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT} constituencies in master data, "
            f"found {constituency_count}. Seed district/constituency data first."
        )

    constituencies = list(
        db.execute(
            select(Constituency).order_by(Constituency.id)
        ).scalars().all()
    )

    # Take exactly the first 165 constituencies for FPTP
    fptp_constituencies = constituencies[:FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT]

    # Create FPTP contests
    for c in fptp_constituencies:
        contest = ElectionContest(
            election_id=election.id,
            contest_type=CONTEST_TYPE_FPTP,
            title=f"FPTP – {c.name}",
            seat_count=FPTP_SEATS_PER_CONSTITUENCY,
            constituency_id=c.id,
        )
        db.add(contest)

    # Create single PR national contest
    pr_contest = ElectionContest(
        election_id=election.id,
        contest_type=CONTEST_TYPE_PR,
        title="PR – National Proportional Representation",
        seat_count=FEDERAL_HOR_PR_SEATS,
        constituency_id=None,
    )
    db.add(pr_contest)

    db.commit()

    return {
        "fptp_contests_created": FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT,
        "pr_contests_created": 1,
        "total_contests": FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT + 1,
    }


# ── Readiness checks ───────────────────────────────────────────

def check_structure_readiness(db: Session, election: Election) -> dict:
    """Check if a federal HoR election's structure is ready for configuration."""
    issues: list[str] = []

    contest_counts = election_repository.count_contests(db, election.id)
    fptp = contest_counts.get(CONTEST_TYPE_FPTP, 0)
    pr = contest_counts.get(CONTEST_TYPE_PR, 0)

    constituency_count = db.execute(
        select(func.count()).select_from(Constituency)
    ).scalar_one()

    if election.government_level != "FEDERAL" or election.election_subtype != "HOR_DIRECT":
        issues.append("Only FEDERAL/HOR_DIRECT elections support structure readiness checks currently")
    else:
        if fptp != FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT:
            issues.append(
                f"Expected {FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT} FPTP contests, found {fptp}"
            )
        if pr != 1:
            issues.append(f"Expected 1 PR contest, found {pr}")

    return {
        "ready": len(issues) == 0,
        "issues": issues,
        "fptp_contests": fptp,
        "pr_contests": pr,
        "total_constituencies": constituency_count,
    }


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
