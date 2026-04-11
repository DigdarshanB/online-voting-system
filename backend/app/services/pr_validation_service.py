"""PR closed-list validation service — system-driven, non-bypassable.

Validation checks:
1. List is not empty
2. Entry count does not exceed PR seat count for this election
3. List positions are sequential 1..N with no gaps
4. No duplicate candidates within same list
5. No candidate appears in another party's PR list for the same election
6. No candidate appears in both FPTP and PR for the same election
7. Required metadata present on every candidate (full_name, date_of_birth, gender)
8. Quota-readiness direction hints (warnings only, not blocking)

PR seat limits are resolved per-election from the election's PR contest(s)
and are never hard-coded to a federal assumption.

Admin UI displays outcomes but cannot override structural validation.
"""

import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.candidate_profile import CandidateProfile
from app.models.election import Election
from app.models.party import Party
from app.models.pr_party_list_entry import PrPartyListEntry
from app.models.pr_party_submission import PrPartySubmission
from app.repositories import candidate_repository


class PrValidationError(Exception):
    pass


# ── Allowed election statuses ───────────────────────────────────

PR_ALLOWED_STATUSES = ("NOMINATIONS_OPEN",)
PR_EDITABLE_SUBMISSION_STATUSES = ("DRAFT", "INVALID")


def _require_election_status(election: Election) -> None:
    if election.status not in PR_ALLOWED_STATUSES:
        raise PrValidationError(
            f"PR submissions not allowed: election status is '{election.status}', "
            f"must be one of {PR_ALLOWED_STATUSES}"
        )


def _require_editable(submission: PrPartySubmission) -> None:
    if submission.status not in PR_EDITABLE_SUBMISSION_STATUSES:
        raise PrValidationError(
            f"Cannot edit submission in '{submission.status}' status. "
            f"Reopen to DRAFT first."
        )


# ── Submission CRUD ─────────────────────────────────────────────

def create_submission(
    db: Session, *, election: Election, party_id: int,
) -> PrPartySubmission:
    _require_election_status(election)

    party = db.get(Party, party_id)
    if not party or not party.is_active:
        raise PrValidationError("Party not found or inactive")

    existing = candidate_repository.get_submission_by_election_party(
        db, election.id, party_id,
    )
    if existing:
        raise PrValidationError(
            "A PR submission already exists for this party and election"
        )

    submission = PrPartySubmission(
        election_id=election.id,
        party_id=party_id,
        status="DRAFT",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def delete_submission(db: Session, submission: PrPartySubmission) -> None:
    if submission.status not in ("DRAFT", "INVALID"):
        raise PrValidationError(
            f"Cannot delete submission in '{submission.status}' status"
        )
    candidate_repository.delete_all_entries(db, submission.id)
    candidate_repository.delete_submission(db, submission)
    db.commit()


def reopen_submission(db: Session, submission: PrPartySubmission) -> PrPartySubmission:
    """Move a SUBMITTED/INVALID/REJECTED submission back to DRAFT for editing."""
    if submission.status not in ("SUBMITTED", "INVALID", "REJECTED"):
        raise PrValidationError(
            f"Cannot reopen submission in '{submission.status}' status"
        )
    submission.status = "DRAFT"
    submission.validation_snapshot = None
    submission.validated_at = None
    db.commit()
    db.refresh(submission)
    return submission


# ── Eligible candidate lookup ───────────────────────────────────

def get_pr_eligible_candidates(
    db: Session,
    *,
    election_id: int,
    party_id: int,
) -> list[CandidateProfile]:
    """Return candidates eligible for a PR list entry in this election.

    Eligible means:
    - Active and belongs to the specified party
    - Not nominated in any FPTP contest for this election
    - Not already in any PR entry for this election
    """
    from app.models.fptp_candidate_nomination import FptpCandidateNomination

    candidates = list(
        db.execute(
            select(CandidateProfile).where(
                CandidateProfile.party_id == party_id,
                CandidateProfile.is_active == True,  # noqa: E712
            )
        ).scalars().all()
    )
    if not candidates:
        return []

    candidate_ids = {c.id for c in candidates}

    # Candidates already in FPTP nominations for this election
    fptp_nominated_ids = set(
        db.execute(
            select(FptpCandidateNomination.candidate_id).where(
                FptpCandidateNomination.election_id == election_id,
                FptpCandidateNomination.candidate_id.in_(candidate_ids),
            )
        ).scalars().all()
    )

    # Candidates already in any PR entry for this election
    pr_used_ids = set(
        db.execute(
            select(PrPartyListEntry.candidate_id)
            .join(PrPartySubmission, PrPartyListEntry.submission_id == PrPartySubmission.id)
            .where(
                PrPartySubmission.election_id == election_id,
                PrPartyListEntry.candidate_id.in_(candidate_ids),
            )
        ).scalars().all()
    )

    excluded_ids = fptp_nominated_ids | pr_used_ids
    return [c for c in candidates if c.id not in excluded_ids]


# ── List entry management ───────────────────────────────────────

def add_entry(
    db: Session,
    submission: PrPartySubmission,
    *,
    candidate_id: int,
    list_position: int,
) -> PrPartyListEntry:
    _require_editable(submission)

    profile = db.get(CandidateProfile, candidate_id)
    if not profile:
        raise PrValidationError(f"Candidate profile {candidate_id} not found")
    if not profile.is_active:
        raise PrValidationError("Candidate is inactive")

    # Must belong to the submission's party
    if profile.party_id != submission.party_id:
        raise PrValidationError(
            "Candidate does not belong to this submission's party"
        )

    # Must not be in FPTP for this election
    from app.models.fptp_candidate_nomination import FptpCandidateNomination

    fptp_nom = db.execute(
        select(FptpCandidateNomination).where(
            FptpCandidateNomination.election_id == submission.election_id,
            FptpCandidateNomination.candidate_id == candidate_id,
        )
    ).scalar_one_or_none()
    if fptp_nom:
        raise PrValidationError(
            "Candidate is already nominated for an FPTP contest in this election"
        )

    # Must not be in another PR list for this election
    other_pr = db.execute(
        select(PrPartyListEntry)
        .join(PrPartySubmission, PrPartyListEntry.submission_id == PrPartySubmission.id)
        .where(
            PrPartySubmission.election_id == submission.election_id,
            PrPartySubmission.id != submission.id,
            PrPartyListEntry.candidate_id == candidate_id,
        )
    ).scalar_one_or_none()
    if other_pr:
        raise PrValidationError(
            "Candidate is already in another party's PR list for this election"
        )

    # check duplicate candidate in this list
    existing_candidate = db.execute(
        select(PrPartyListEntry).where(
            PrPartyListEntry.submission_id == submission.id,
            PrPartyListEntry.candidate_id == candidate_id,
        )
    ).scalar_one_or_none()
    if existing_candidate:
        raise PrValidationError("Candidate already in this PR list")

    # check position not taken
    existing_pos = db.execute(
        select(PrPartyListEntry).where(
            PrPartyListEntry.submission_id == submission.id,
            PrPartyListEntry.list_position == list_position,
        )
    ).scalar_one_or_none()
    if existing_pos:
        raise PrValidationError(f"Position {list_position} is already occupied")

    if list_position < 1:
        raise PrValidationError("Position must be >= 1")

    entry = PrPartyListEntry(
        submission_id=submission.id,
        candidate_id=candidate_id,
        list_position=list_position,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def remove_entry(db: Session, submission: PrPartySubmission, entry: PrPartyListEntry) -> None:
    _require_editable(submission)
    if entry.submission_id != submission.id:
        raise PrValidationError("Entry does not belong to this submission")
    candidate_repository.delete_entry(db, entry)
    db.commit()


def reorder_entries(
    db: Session,
    submission: PrPartySubmission,
    ordered_candidate_ids: list[int],
) -> list[PrPartyListEntry]:
    """Re-assign positions 1..N based on the supplied candidate-ID order."""
    _require_editable(submission)

    entries = candidate_repository.list_entries(db, submission.id)
    entry_map = {e.candidate_id: e for e in entries}

    if set(ordered_candidate_ids) != set(entry_map.keys()):
        raise PrValidationError(
            "Supplied candidate IDs must match the existing entries exactly"
        )
    if len(ordered_candidate_ids) != len(set(ordered_candidate_ids)):
        raise PrValidationError("Duplicate candidate IDs in reorder list")

    # clear positions to avoid unique constraint conflicts during update
    for e in entries:
        e.list_position = -(e.id)  # temporary negative
    db.flush()

    # assign new positions
    for pos, cid in enumerate(ordered_candidate_ids, start=1):
        entry_map[cid].list_position = pos
    db.commit()

    return candidate_repository.list_entries(db, submission.id)


# ── System-driven validation ────────────────────────────────────

REQUIRED_CANDIDATE_FIELDS = ("full_name", "date_of_birth", "gender")


def validate_pr_list(db: Session, submission: PrPartySubmission) -> dict:
    """Run comprehensive validation. Returns structured result dict.

    This is the authoritative validation — no admin can bypass it.
    """
    errors: list[dict] = []
    warnings: list[dict] = []

    entries = candidate_repository.list_entries(db, submission.id)

    # Determine the max PR seats for this election.
    # Sum up seat_count across all PR contests in the election.
    # Never fall back to a hard-coded federal number.
    from app.models.election_contest import ElectionContest
    pr_seat_total = db.execute(
        select(func.sum(ElectionContest.seat_count))
        .where(
            ElectionContest.election_id == submission.election_id,
            ElectionContest.contest_type == "PR",
        )
    ).scalar_one()
    if pr_seat_total is None or int(pr_seat_total) == 0:
        errors.append({
            "code": "NO_PR_SEATS",
            "message": (
                "No PR contest with seat_count > 0 found for this election. "
                "Generate/configure election structure first."
            ),
        })
        return _build_result(errors, warnings, entries)
    max_entries = int(pr_seat_total)

    # 1. Non-empty
    if not entries:
        errors.append({
            "code": "EMPTY_LIST",
            "message": "PR list has no candidates",
        })
        return _build_result(errors, warnings, entries)

    # 2. Max entries
    if len(entries) > max_entries:
        errors.append({
            "code": "TOO_MANY_ENTRIES",
            "message": f"PR list has {len(entries)} entries, maximum is {max_entries}",
            "count": len(entries),
            "max": max_entries,
        })

    # 3. Positions sequential 1..N
    positions = sorted(e.list_position for e in entries)
    expected = list(range(1, len(entries) + 1))
    if positions != expected:
        errors.append({
            "code": "POSITION_GAP",
            "message": f"Positions are not sequential 1..{len(entries)}: found {positions}",
            "found": positions,
            "expected": expected,
        })

    # 4. No duplicate candidates in this list
    candidate_ids = [e.candidate_id for e in entries]
    if len(set(candidate_ids)) != len(candidate_ids):
        seen = set()
        dupes = []
        for cid in candidate_ids:
            if cid in seen:
                dupes.append(cid)
            seen.add(cid)
        errors.append({
            "code": "DUPLICATE_IN_LIST",
            "message": f"Duplicate candidate IDs in list: {dupes}",
            "duplicates": dupes,
        })

    # 5. Cross-party duplicate check: candidate not in another party's list for same election
    for entry in entries:
        other = db.execute(
            select(PrPartyListEntry)
            .join(PrPartySubmission, PrPartyListEntry.submission_id == PrPartySubmission.id)
            .where(
                PrPartySubmission.election_id == submission.election_id,
                PrPartySubmission.id != submission.id,
                PrPartyListEntry.candidate_id == entry.candidate_id,
            )
        ).scalar_one_or_none()
        if other:
            # find which party
            other_sub = db.get(PrPartySubmission, other.submission_id)
            other_party = db.get(Party, other_sub.party_id) if other_sub else None
            errors.append({
                "code": "CANDIDATE_IN_OTHER_LIST",
                "message": (
                    f"Candidate {entry.candidate_id} already in PR list of "
                    f"party '{other_party.name if other_party else '?'}'"
                ),
                "candidate_id": entry.candidate_id,
                "other_party_id": other_sub.party_id if other_sub else None,
                "position": entry.list_position,
            })

    # 6. FPTP ↔ PR mutual exclusion: no candidate may be in both FPTP and PR
    from app.models.fptp_candidate_nomination import FptpCandidateNomination
    for entry in entries:
        fptp_nom = db.execute(
            select(FptpCandidateNomination).where(
                FptpCandidateNomination.election_id == submission.election_id,
                FptpCandidateNomination.candidate_id == entry.candidate_id,
            )
        ).scalar_one_or_none()
        if fptp_nom:
            fptp_contest = db.get(ElectionContest, fptp_nom.contest_id)
            errors.append({
                "code": "CANDIDATE_IN_FPTP",
                "message": (
                    f"Candidate {entry.candidate_id} is also nominated for "
                    f"FPTP contest '{fptp_contest.title if fptp_contest else fptp_nom.contest_id}'. "
                    f"A candidate cannot be in both FPTP and PR for the same election."
                ),
                "candidate_id": entry.candidate_id,
                "fptp_contest_id": fptp_nom.contest_id,
                "position": entry.list_position,
            })

    # 7. Required metadata check
    for entry in entries:
        profile = db.get(CandidateProfile, entry.candidate_id)
        if not profile:
            errors.append({
                "code": "CANDIDATE_NOT_FOUND",
                "message": f"Candidate profile {entry.candidate_id} not found",
                "candidate_id": entry.candidate_id,
                "position": entry.list_position,
            })
            continue
        for field in REQUIRED_CANDIDATE_FIELDS:
            val = getattr(profile, field, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                errors.append({
                    "code": "MISSING_METADATA",
                    "message": f"Candidate {profile.full_name} (pos {entry.list_position}): missing {field}",
                    "candidate_id": entry.candidate_id,
                    "field": field,
                    "position": entry.list_position,
                })

    # 8. Quota-readiness hints (warnings, not errors)
    gender_counts: dict[str, int] = {}
    for entry in entries:
        profile = db.get(CandidateProfile, entry.candidate_id)
        if profile and profile.gender:
            gender_counts[profile.gender] = gender_counts.get(profile.gender, 0) + 1
    total = len(entries)
    if total > 0:
        for g in ("MALE", "FEMALE"):
            pct = gender_counts.get(g, 0) / total
            if pct < 0.33:
                warnings.append({
                    "code": "QUOTA_HINT",
                    "message": (
                        f"{g} representation is {gender_counts.get(g, 0)}/{total} "
                        f"({pct:.0%}). Consider reviewing inclusion targets."
                    ),
                    "gender": g,
                    "count": gender_counts.get(g, 0),
                    "total": total,
                })

    return _build_result(errors, warnings, entries)


def _build_result(
    errors: list[dict], warnings: list[dict], entries: list,
) -> dict:
    candidate_ids = [e.candidate_id for e in entries]
    positions = sorted(e.list_position for e in entries)
    expected = list(range(1, len(entries) + 1))
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "summary": {
            "total_entries": len(entries),
            "positions_sequential": positions == expected if entries else True,
            "no_duplicates_in_list": len(set(candidate_ids)) == len(candidate_ids) if entries else True,
            "no_cross_party_duplicates": not any(
                e["code"] == "CANDIDATE_IN_OTHER_LIST" for e in errors
            ),
            "no_fptp_pr_overlap": not any(
                e["code"] == "CANDIDATE_IN_FPTP" for e in errors
            ),
            "metadata_complete": not any(
                e["code"] == "MISSING_METADATA" for e in errors
            ),
        },
    }


# ── Submit (validate + lock) ───────────────────────────────────

def submit_pr_list(db: Session, submission: PrPartySubmission) -> PrPartySubmission:
    """Validate and submit the PR list. Cannot bypass validation."""
    if submission.status not in PR_EDITABLE_SUBMISSION_STATUSES:
        raise PrValidationError(
            f"Cannot submit: submission is in '{submission.status}' status, "
            f"must be DRAFT or INVALID"
        )

    result = validate_pr_list(db, submission)
    now = datetime.now(timezone.utc)

    submission.validation_snapshot = json.dumps(result)
    submission.validated_at = now

    if result["valid"]:
        submission.status = "SUBMITTED"
        submission.submitted_at = now
    else:
        submission.status = "INVALID"

    db.commit()
    db.refresh(submission)
    return submission


# ── Admin approve / reject (only after submission) ──────────────

def approve_submission(
    db: Session, submission: PrPartySubmission, *, reviewed_by: int,
    notes: str | None = None,
) -> PrPartySubmission:
    if submission.status != "SUBMITTED":
        raise PrValidationError(
            "Can only approve a SUBMITTED submission (must pass validation first)"
        )
    submission.status = "APPROVED"
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by = reviewed_by
    if notes is not None:
        submission.notes = notes
    db.commit()
    db.refresh(submission)
    return submission


def reject_submission(
    db: Session, submission: PrPartySubmission, *, reviewed_by: int,
    notes: str | None = None,
) -> PrPartySubmission:
    if submission.status not in ("SUBMITTED",):
        raise PrValidationError(
            "Can only reject a SUBMITTED submission"
        )
    submission.status = "REJECTED"
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.reviewed_by = reviewed_by
    if notes is not None:
        submission.notes = notes
    db.commit()
    db.refresh(submission)
    return submission


# ── Candidate-side readiness (informational) ────────────────────

def check_candidate_readiness(db: Session, election: Election) -> dict:
    """Candidate-side readiness overview. Informational only — does not block.

    Multi-level aware: checks nominations for all contest types that exist
    in this election including local ward-level types with multi-seat logic.
    PR submission checks only run for elections that have PR contests.
    Local direct elections have no PR.
    """
    from app.models.fptp_candidate_nomination import FptpCandidateNomination
    from app.models.election_contest import ElectionContest
    from app.core.election_constants import CONTEST_TYPE_WARD_MEMBER_OPEN

    issues: list[str] = []
    details: dict = {}

    # Get all contest types in this election with counts
    contest_type_counts = dict(
        db.execute(
            select(ElectionContest.contest_type, func.count(ElectionContest.id))
            .where(ElectionContest.election_id == election.id)
            .group_by(ElectionContest.contest_type)
        ).all()
    )

    # All nominatable contest types in this election (everything except PR)
    nominatable_types = [ct for ct in contest_type_counts if ct != "PR"]

    for ct in nominatable_types:
        total = contest_type_counts.get(ct, 0)
        if total == 0:
            continue

        if ct == CONTEST_TYPE_WARD_MEMBER_OPEN:
            # Multi-seat contest (seat_count=2): "filled" means ≥ seat_count+1
            # approved candidates in that contest (competitive election requires
            # more candidates than seats). We use ≥3 as the fill threshold.
            # But for minimum viability, we check ≥ seat_count (at least 2).
            filled = db.execute(
                select(func.count()).select_from(
                    select(FptpCandidateNomination.contest_id)
                    .join(ElectionContest, FptpCandidateNomination.contest_id == ElectionContest.id)
                    .where(
                        FptpCandidateNomination.election_id == election.id,
                        ElectionContest.contest_type == ct,
                        FptpCandidateNomination.status == "APPROVED",
                    )
                    .group_by(FptpCandidateNomination.contest_id)
                    .having(func.count(FptpCandidateNomination.id) >= 3)
                    .subquery()
                )
            ).scalar_one()
            details[f"{ct.lower()}_contests_total"] = total
            details[f"{ct.lower()}_contests_filled"] = filled
            if filled < total:
                issues.append(
                    f"Only {filled}/{total} {ct} contests have ≥3 approved candidates "
                    f"(2 seats requires at least 3 for a competitive election)"
                )
        else:
            # Single-seat types: "filled" means ≥ 2 approved candidates
            filled = db.execute(
                select(func.count()).select_from(
                    select(FptpCandidateNomination.contest_id)
                    .join(ElectionContest, FptpCandidateNomination.contest_id == ElectionContest.id)
                    .where(
                        FptpCandidateNomination.election_id == election.id,
                        ElectionContest.contest_type == ct,
                        FptpCandidateNomination.status == "APPROVED",
                    )
                    .group_by(FptpCandidateNomination.contest_id)
                    .having(func.count(FptpCandidateNomination.id) >= 2)
                    .subquery()
                )
            ).scalar_one()
            details[f"{ct.lower()}_contests_total"] = total
            details[f"{ct.lower()}_contests_filled"] = filled
            if filled < total:
                issues.append(
                    f"Only {filled}/{total} {ct} contests have ≥2 approved candidates"
                )

    # PR submissions check (only if election has PR contests — NOT for local direct)
    pr_total_contests = contest_type_counts.get("PR", 0)
    if pr_total_contests > 0:
        pr_total = db.execute(
            select(func.count()).select_from(PrPartySubmission)
            .where(PrPartySubmission.election_id == election.id)
        ).scalar_one()
        pr_submitted = db.execute(
            select(func.count()).select_from(PrPartySubmission)
            .where(
                PrPartySubmission.election_id == election.id,
                PrPartySubmission.status.in_(("SUBMITTED", "APPROVED")),
            )
        ).scalar_one()

        details["pr_submissions_total"] = pr_total
        details["pr_submissions_valid"] = pr_submitted

        if pr_total == 0:
            issues.append("No PR submissions exist for this election")
        elif pr_submitted < pr_total:
            issues.append(
                f"Only {pr_submitted}/{pr_total} PR submissions are submitted/approved"
            )

    return {
        "ready": len(issues) == 0,
        "issues": issues,
        "contest_types": list(contest_type_counts.keys()),
        **details,
    }
