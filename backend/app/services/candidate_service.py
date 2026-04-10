"""Candidate profile + FPTP nomination service.

Business rules:
- Candidates may be nominated for FPTP only in NOMINATIONS_OPEN elections
- One nomination per candidate per contest (enforced by unique constraint)
- A candidate may only contest one FPTP constituency per election
- A candidate cannot be in both FPTP and PR for the same election
- A party can have at most one pending/approved candidate per FPTP contest
- For provincial elections: contest area must belong to the election's province
- Only PENDING / WITHDRAWN nominations may be deleted
- Approve/reject transitions require admin review
"""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.area_unit import AreaUnit
from app.models.candidate_profile import CandidateProfile
from app.models.election import Election
from app.models.election_contest import ElectionContest
from app.models.fptp_candidate_nomination import FptpCandidateNomination
from app.models.party import Party
from app.models.pr_party_list_entry import PrPartyListEntry
from app.models.pr_party_submission import PrPartySubmission
from app.repositories import candidate_repository


class CandidateServiceError(Exception):
    pass


# ── Election status gates ───────────────────────────────────────

NOMINATION_ALLOWED_STATUSES = ("NOMINATIONS_OPEN",)


def _require_nomination_status(election: Election) -> None:
    if election.status not in NOMINATION_ALLOWED_STATUSES:
        raise CandidateServiceError(
            f"Nominations not allowed: election status is '{election.status}', "
            f"must be one of {NOMINATION_ALLOWED_STATUSES}"
        )


# ── Candidate profile CRUD ─────────────────────────────────────

def create_profile(
    db: Session,
    *,
    full_name: str,
    date_of_birth=None,
    gender: str | None = None,
    address: str | None = None,
    citizenship_no: str | None = None,
    photo_path: str | None = None,
    qualifications: str | None = None,
    party_id: int | None = None,
) -> CandidateProfile:
    if party_id is not None:
        party = db.get(Party, party_id)
        if not party:
            raise CandidateServiceError(f"Party {party_id} not found")
        if not party.is_active:
            raise CandidateServiceError(f"Party '{party.name}' is inactive")

    profile = CandidateProfile(
        full_name=full_name,
        date_of_birth=date_of_birth,
        gender=gender,
        address=address,
        citizenship_no=citizenship_no,
        photo_path=photo_path,
        qualifications=qualifications,
        party_id=party_id,
    )
    candidate_repository.create_profile(db, profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_profile(
    db: Session,
    profile: CandidateProfile,
    *,
    full_name: str | None = None,
    date_of_birth=...,
    gender=...,
    address=...,
    citizenship_no=...,
    photo_path=...,
    qualifications=...,
    party_id=...,
    is_active: bool | None = None,
) -> CandidateProfile:
    if full_name is not None:
        profile.full_name = full_name
    if date_of_birth is not ...:
        profile.date_of_birth = date_of_birth
    if gender is not ...:
        profile.gender = gender
    if address is not ...:
        profile.address = address
    if citizenship_no is not ...:
        profile.citizenship_no = citizenship_no
    if photo_path is not ...:
        profile.photo_path = photo_path
    if qualifications is not ...:
        profile.qualifications = qualifications
    if party_id is not ...:
        if party_id is not None:
            party = db.get(Party, party_id)
            if not party:
                raise CandidateServiceError(f"Party {party_id} not found")
        profile.party_id = party_id
    if is_active is not None:
        profile.is_active = is_active
    db.commit()
    db.refresh(profile)
    return profile


def delete_profile(db: Session, profile: CandidateProfile) -> None:
    from app.models.pr_party_list_entry import PrPartyListEntry

    nom_count = db.execute(
        select(func.count()).select_from(FptpCandidateNomination)
        .where(FptpCandidateNomination.candidate_id == profile.id)
    ).scalar_one()
    if nom_count > 0:
        raise CandidateServiceError(
            f"Cannot delete candidate: {nom_count} FPTP nomination(s) reference it"
        )
    entry_count = db.execute(
        select(func.count()).select_from(PrPartyListEntry)
        .where(PrPartyListEntry.candidate_id == profile.id)
    ).scalar_one()
    if entry_count > 0:
        raise CandidateServiceError(
            f"Cannot delete candidate: {entry_count} PR list entry/entries reference it"
        )
    candidate_repository.delete_profile(db, profile)
    db.commit()


# ── FPTP / single-seat nominations ────────────────────────────────

# Contest types that use the FPTP nomination table (one candidate per seat)
SINGLE_SEAT_CONTEST_TYPES = ("FPTP", "MAYOR", "DEPUTY_MAYOR")


def create_fptp_nomination(
    db: Session,
    *,
    election: Election,
    contest_id: int,
    candidate_id: int,
    party_id: int | None = None,
) -> FptpCandidateNomination:
    _require_nomination_status(election)

    # validate contest belongs to election and is a single-seat type
    contest = db.get(ElectionContest, contest_id)
    if not contest or contest.election_id != election.id:
        raise CandidateServiceError("Contest not found for this election")
    if contest.contest_type not in SINGLE_SEAT_CONTEST_TYPES:
        raise CandidateServiceError(
            f"Can only nominate for {SINGLE_SEAT_CONTEST_TYPES} contests via this endpoint"
        )

    # validate candidate exists and is active
    profile = db.get(CandidateProfile, candidate_id)
    if not profile:
        raise CandidateServiceError(f"Candidate profile {candidate_id} not found")
    if not profile.is_active:
        raise CandidateServiceError("Candidate is inactive")

    # validate party if provided
    if party_id is not None:
        party = db.get(Party, party_id)
        if not party or not party.is_active:
            raise CandidateServiceError("Party not found or inactive")

    # ── Provincial contest-area coherence ──────────────────────
    # For provincial elections, verify the contest's area_id resolves
    # to a constituency in the election's province.
    if election.government_level == "PROVINCIAL" and contest.area_id is not None:
        area = db.get(AreaUnit, contest.area_id)
        if area is None:
            raise CandidateServiceError(
                "Contest's area_id does not resolve to a valid area_unit"
            )
        # Resolve the province_number from the election
        election_prov_num = None
        if election.scope_area_id:
            prov_area = db.get(AreaUnit, election.scope_area_id)
            if prov_area:
                election_prov_num = prov_area.province_number
        if election_prov_num is not None and area.province_number != election_prov_num:
            raise CandidateServiceError(
                f"Contest area '{area.name}' belongs to province {area.province_number}, "
                f"but this election is scoped to province {election_prov_num}"
            )

    # ── FPTP → PR mutual exclusion ─────────────────────────────
    # A candidate cannot be in both FPTP and PR for the same election.
    pr_entry = db.execute(
        select(PrPartyListEntry)
        .join(PrPartySubmission, PrPartyListEntry.submission_id == PrPartySubmission.id)
        .where(
            PrPartySubmission.election_id == election.id,
            PrPartyListEntry.candidate_id == candidate_id,
        )
    ).scalar_one_or_none()
    if pr_entry:
        raise CandidateServiceError(
            "This candidate is already on a PR list for this election. "
            "A candidate cannot be in both FPTP and PR for the same election."
        )

    # check duplicate in same contest (also enforced by unique constraint)
    existing = db.execute(
        select(FptpCandidateNomination).where(
            FptpCandidateNomination.contest_id == contest_id,
            FptpCandidateNomination.candidate_id == candidate_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise CandidateServiceError(
            "This candidate is already nominated for this contest"
        )

    # ── One party per contest ──────────────────────────────────
    # A party can have at most one PENDING or APPROVED candidate in a
    # given contest. This prevents two candidates from the same party
    # competing in the same constituency.
    if party_id is not None:
        same_party_nom = db.execute(
            select(FptpCandidateNomination).where(
                FptpCandidateNomination.contest_id == contest_id,
                FptpCandidateNomination.party_id == party_id,
                FptpCandidateNomination.status.in_(("PENDING", "APPROVED")),
            )
        ).scalar_one_or_none()
        if same_party_nom:
            raise CandidateServiceError(
                f"This party already has a pending/approved candidate in this contest "
                f"(nomination #{same_party_nom.id}). "
                f"Withdraw or reject that nomination first."
            )

    # ── Cross-constituency uniqueness ──────────────────────────
    # A candidate may only be nominated to ONE single-seat contest
    # of the same contest_type within the same election.
    # e.g. one FPTP contest per election, one MAYOR contest per election.
    existing_other = db.execute(
        select(FptpCandidateNomination).join(
            ElectionContest, FptpCandidateNomination.contest_id == ElectionContest.id
        ).where(
            FptpCandidateNomination.election_id == election.id,
            FptpCandidateNomination.candidate_id == candidate_id,
            ElectionContest.contest_type == contest.contest_type,
            FptpCandidateNomination.contest_id != contest_id,
        )
    ).scalar_one_or_none()
    if existing_other:
        other_contest = db.get(ElectionContest, existing_other.contest_id)
        raise CandidateServiceError(
            f"This candidate is already nominated to another {contest.contest_type} "
            f"contest in this election: '{other_contest.title if other_contest else existing_other.contest_id}'. "
            f"Remove that nomination first."
        )

    nomination = FptpCandidateNomination(
        election_id=election.id,
        contest_id=contest_id,
        candidate_id=candidate_id,
        party_id=party_id,
        status="PENDING",
    )
    db.add(nomination)
    db.commit()
    db.refresh(nomination)
    return nomination


FPTP_STATUS_TRANSITIONS = {
    "PENDING": ("APPROVED", "REJECTED", "WITHDRAWN"),
    "APPROVED": ("WITHDRAWN",),
    "REJECTED": (),
    "WITHDRAWN": (),
}


def update_fptp_nomination_status(
    db: Session,
    nomination: FptpCandidateNomination,
    *,
    new_status: str,
    reviewed_by: int | None = None,
    notes: str | None = None,
) -> FptpCandidateNomination:
    allowed = FPTP_STATUS_TRANSITIONS.get(nomination.status, ())
    if new_status not in allowed:
        raise CandidateServiceError(
            f"Cannot transition from '{nomination.status}' to '{new_status}'"
        )
    nomination.status = new_status
    if new_status in ("APPROVED", "REJECTED"):
        nomination.reviewed_at = datetime.now(timezone.utc)
        nomination.reviewed_by = reviewed_by
    if notes is not None:
        nomination.notes = notes
    db.commit()
    db.refresh(nomination)
    return nomination


DELETABLE_NOMINATION_STATUSES = ("PENDING", "WITHDRAWN")


def delete_fptp_nomination(db: Session, nomination: FptpCandidateNomination) -> None:
    if nomination.status not in DELETABLE_NOMINATION_STATUSES:
        raise CandidateServiceError(
            f"Cannot delete nomination in '{nomination.status}' status"
        )
    candidate_repository.delete_nomination(db, nomination)
    db.commit()
