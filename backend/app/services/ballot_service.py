import json
import os
from datetime import datetime, timezone

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException
from sqlalchemy import case, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.federal_constants import CONTEST_TYPE_FPTP, CONTEST_TYPE_PR
from app.models.ballot import Ballot
from app.models.candidate_profile import CandidateProfile
from app.models.constituency import Constituency
from app.models.area_unit import AreaUnit
from app.models.election import Election
from app.models.election_contest import ElectionContest
from app.models.fptp_candidate_nomination import FptpCandidateNomination
from app.models.party import Party
from app.models.pr_party_submission import PrPartySubmission
from app.models.user import User
from app.models.voter_area_assignment import VoterAreaAssignment
from app.models.voter_constituency_assignment import VoterConstituencyAssignment
from app.repositories import ballot_repository


# ── Encryption helpers ──────────────────────────────────────────


def _get_aesgcm() -> AESGCM:
    key = bytes.fromhex(settings.BALLOT_ENCRYPTION_KEY)
    return AESGCM(key)


def _encrypt_choice(payload: dict) -> tuple[bytes, bytes]:
    """Encrypt a ballot choice dict with AES-256-GCM.

    Returns (ciphertext_with_tag, nonce).
    """
    plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = _get_aesgcm().encrypt(nonce, plaintext, None)
    return ciphertext, nonce


# ── Voter-visible election statuses ─────────────────────────────
# Elections only become visible to voters AFTER polling opens.
# CANDIDATE_LIST_PUBLISHED is intentionally excluded — voters must not
# see elections until the admin starts voting.

VOTER_VISIBLE_STATUSES = (
    "POLLING_OPEN",
    "POLLING_CLOSED",
    "COUNTING",
    "FINALIZED",
    "ARCHIVED",
)


# ── List elections available to a voter ──────────────────────────


def _get_voter_constituency_id(db: Session, voter_id: int) -> int | None:
    """Return the voter's assigned constituency_id, or None."""
    row = db.execute(
        select(VoterConstituencyAssignment.constituency_id).where(
            VoterConstituencyAssignment.voter_id == voter_id
        )
    ).scalar_one_or_none()
    return row


def _get_voter_area_assignment(
    db: Session, voter_id: int, government_level: str
) -> VoterAreaAssignment | None:
    """Return the voter's area assignment for a given government level, or None."""
    return db.execute(
        select(VoterAreaAssignment).where(
            VoterAreaAssignment.voter_id == voter_id,
            VoterAreaAssignment.government_level == government_level,
        )
    ).scalar_one_or_none()


def _is_eligible_for_election(
    db: Session, election: Election, voter_id: int, voter_constituency_id: int | None
) -> bool:
    """Check whether a voter is eligible for a specific election.

    Federal elections require that the voter has a constituency assignment
    AND that the election contains an FPTP contest for that constituency.
    Provincial elections require a VoterAreaAssignment at the PROVINCIAL level
    where the assigned area's province matches the election's province.
    """
    if election.government_level == "FEDERAL":
        if voter_constituency_id is None:
            return False
        match = db.execute(
            select(ElectionContest.id).where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == CONTEST_TYPE_FPTP,
                ElectionContest.constituency_id == voter_constituency_id,
            )
        ).scalar_one_or_none()
        return match is not None

    if election.government_level == "PROVINCIAL":
        assignment = _get_voter_area_assignment(db, voter_id, "PROVINCIAL")
        if not assignment:
            return False
        # Check the assigned area's province matches the election's province
        area = db.get(AreaUnit, assignment.area_id)
        if not area or not area.province_number:
            return False
        # Election.province_code is e.g. "P1", "P2" etc.
        if election.province_code != f"P{area.province_number}":
            return False
        # Voter must have a matching FPTP contest in this election for their area
        fptp_match = db.execute(
            select(ElectionContest.id).where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == CONTEST_TYPE_FPTP,
                ElectionContest.area_id == assignment.area_id,
            )
        ).scalar_one_or_none()
        return fptp_match is not None

    # Local — not yet implemented; pass through
    return True


def list_voter_elections(db: Session, voter: User) -> list[dict]:
    elections = (
        db.execute(
            select(Election)
            .where(Election.status.in_(VOTER_VISIBLE_STATUSES))
            .order_by(
                case(
                    (Election.polling_start_at.is_(None), 1),
                    else_=0,
                ),
                Election.polling_start_at.desc(),
                Election.created_at.desc(),
            )
        )
        .scalars()
        .all()
    )

    voter_constituency_id = _get_voter_constituency_id(db, voter.id)
    voted_ids = ballot_repository.get_voted_election_ids(db, voter.id)

    return [
        {
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "government_level": e.government_level,
            "election_subtype": e.election_subtype,
            "status": e.status,
            "polling_start_at": (
                e.polling_start_at.isoformat() if e.polling_start_at else None
            ),
            "polling_end_at": (
                e.polling_end_at.isoformat() if e.polling_end_at else None
            ),
            "has_voted": e.id in voted_ids,
        }
        for e in elections
        if _is_eligible_for_election(db, e, voter.id, voter_constituency_id)
    ]


# ── Get ballot info (candidates / parties for an election) ──────


def get_ballot_info(db: Session, election_id: int, voter: User) -> dict:
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status not in VOTER_VISIBLE_STATUSES:
        raise HTTPException(
            status_code=400, detail="Election is not available for viewing"
        )

    # ── voter's constituency ────────────────────────────────────
    assignment = db.execute(
        select(VoterConstituencyAssignment).where(
            VoterConstituencyAssignment.voter_id == voter.id
        )
    ).scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You have not been assigned to a constituency. Contact the election commission.",
        )

    constituency = db.execute(
        select(Constituency)
        .options(joinedload(Constituency.district))
        .where(Constituency.id == assignment.constituency_id)
    ).unique().scalar_one_or_none()
    if not constituency:
        raise HTTPException(
            status_code=500, detail="Constituency record missing"
        )

    # ── FPTP contest for voter's constituency ───────────────────
    fptp_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            ElectionContest.constituency_id == constituency.id,
        )
    ).scalar_one_or_none()
    if not fptp_contest:
        raise HTTPException(
            status_code=400,
            detail="No FPTP contest found for your constituency in this election",
        )

    fptp_rows = db.execute(
        select(
            FptpCandidateNomination.id.label("nomination_id"),
            CandidateProfile.full_name.label("candidate_name"),
            CandidateProfile.photo_path.label("candidate_photo_path"),
            Party.name.label("party_name"),
            Party.abbreviation.label("party_abbreviation"),
            Party.symbol_path.label("party_symbol_path"),
        )
        .join(
            CandidateProfile,
            FptpCandidateNomination.candidate_id == CandidateProfile.id,
        )
        .outerjoin(Party, FptpCandidateNomination.party_id == Party.id)
        .where(
            FptpCandidateNomination.contest_id == fptp_contest.id,
            FptpCandidateNomination.status == "APPROVED",
        )
        .order_by(CandidateProfile.full_name)
    ).all()

    # ── PR contest (nationwide) ─────────────────────────────────
    pr_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
            ElectionContest.constituency_id.is_(None),
        )
    ).scalar_one_or_none()
    if not pr_contest:
        raise HTTPException(
            status_code=400,
            detail="No PR contest found for this election",
        )

    pr_rows = db.execute(
        select(
            Party.id.label("party_id"),
            Party.name.label("party_name"),
            Party.abbreviation.label("party_abbreviation"),
            Party.symbol_path.label("party_symbol_path"),
        )
        .join(PrPartySubmission, PrPartySubmission.party_id == Party.id)
        .where(
            PrPartySubmission.election_id == election_id,
            PrPartySubmission.status == "APPROVED",
        )
        .order_by(Party.name)
    ).all()

    already_voted = (
        ballot_repository.get_ballot(db, election_id, voter.id) is not None
    )

    return {
        "election_id": election.id,
        "election_title": election.title,
        "election_status": election.status,
        "polling_start_at": (
            election.polling_start_at.isoformat()
            if election.polling_start_at
            else None
        ),
        "polling_end_at": (
            election.polling_end_at.isoformat()
            if election.polling_end_at
            else None
        ),
        "voter_constituency": {
            "id": constituency.id,
            "name": constituency.name,
            "district_name": (
                constituency.district.name
                if constituency.district
                else "Unknown"
            ),
        },
        "fptp": {
            "contest_id": fptp_contest.id,
            "contest_title": fptp_contest.title,
            "candidates": [
                {
                    "nomination_id": r.nomination_id,
                    "candidate_name": r.candidate_name,
                    "candidate_photo_path": r.candidate_photo_path,
                    "party_name": r.party_name,
                    "party_abbreviation": r.party_abbreviation,
                    "party_symbol_path": r.party_symbol_path,
                }
                for r in fptp_rows
            ],
        },
        "pr": {
            "contest_id": pr_contest.id,
            "contest_title": pr_contest.title,
            "parties": [
                {
                    "party_id": r.party_id,
                    "party_name": r.party_name,
                    "party_abbreviation": r.party_abbreviation,
                    "party_symbol_path": r.party_symbol_path,
                }
                for r in pr_rows
            ],
        },
        "already_voted": already_voted,
    }


# ── Cast dual ballot (atomic FPTP + PR) ─────────────────────────


def cast_dual_ballot(
    db: Session,
    election_id: int,
    voter: User,
    fptp_nomination_id: int,
    pr_party_id: int,
) -> dict:
    # 1 — voter eligibility
    if voter.role != "voter":
        raise HTTPException(status_code=403, detail="Only voters can cast ballots")
    if voter.status != "ACTIVE":
        raise HTTPException(
            status_code=403, detail="Your account is not active"
        )

    # 2 — election exists
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    # 3 — polling is open
    if election.status != "POLLING_OPEN":
        raise HTTPException(
            status_code=400,
            detail="This election is not currently open for voting",
        )

    # 4 — polling window enforcement
    now = datetime.now(timezone.utc)
    if election.polling_start_at and now < election.polling_start_at.replace(
        tzinfo=timezone.utc
    ):
        raise HTTPException(
            status_code=400, detail="Polling has not started yet"
        )
    if election.polling_end_at and now > election.polling_end_at.replace(
        tzinfo=timezone.utc
    ):
        raise HTTPException(status_code=400, detail="Polling has ended")

    # 5 — constituency assignment
    assignment = db.execute(
        select(VoterConstituencyAssignment).where(
            VoterConstituencyAssignment.voter_id == voter.id
        )
    ).scalar_one_or_none()
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You have not been assigned to a constituency",
        )

    # 6 — duplicate-vote prevention (service-level check)
    existing = ballot_repository.get_ballot(db, election_id, voter.id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already cast your ballot in this election",
        )

    # 7 — FPTP contest matches voter's constituency
    fptp_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            ElectionContest.constituency_id == assignment.constituency_id,
        )
    ).scalar_one_or_none()
    if not fptp_contest:
        raise HTTPException(
            status_code=400,
            detail="No FPTP contest found for your constituency",
        )

    # 8 — FPTP nomination is approved for that contest
    fptp_nomination = db.execute(
        select(FptpCandidateNomination).where(
            FptpCandidateNomination.id == fptp_nomination_id,
            FptpCandidateNomination.contest_id == fptp_contest.id,
            FptpCandidateNomination.status == "APPROVED",
        )
    ).scalar_one_or_none()
    if not fptp_nomination:
        raise HTTPException(
            status_code=400,
            detail="Invalid FPTP candidate selection for your constituency",
        )

    # 9 — PR contest (national)
    pr_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
            ElectionContest.constituency_id.is_(None),
        )
    ).scalar_one_or_none()
    if not pr_contest:
        raise HTTPException(
            status_code=400,
            detail="No PR contest found for this election",
        )

    # 10 — PR party has approved submission
    pr_submission = db.execute(
        select(PrPartySubmission).where(
            PrPartySubmission.election_id == election_id,
            PrPartySubmission.party_id == pr_party_id,
            PrPartySubmission.status == "APPROVED",
        )
    ).scalar_one_or_none()
    if not pr_submission:
        raise HTTPException(
            status_code=400, detail="Invalid PR party selection"
        )

    # 11 — encrypt both choices
    fptp_ct, fptp_nonce = _encrypt_choice(
        {"contest_id": fptp_contest.id, "nomination_id": fptp_nomination_id}
    )
    pr_ct, pr_nonce = _encrypt_choice(
        {"contest_id": pr_contest.id, "party_id": pr_party_id}
    )

    # 12 — atomic insert (both entries in one transaction)
    try:
        ballot = ballot_repository.create_ballot_with_entries(
            db,
            election_id=election_id,
            voter_id=voter.id,
            constituency_id=assignment.constituency_id,
            entries=[
                {
                    "contest_id": fptp_contest.id,
                    "ballot_type": CONTEST_TYPE_FPTP,
                    "encrypted_choice": fptp_ct,
                    "nonce": fptp_nonce,
                },
                {
                    "contest_id": pr_contest.id,
                    "ballot_type": CONTEST_TYPE_PR,
                    "encrypted_choice": pr_ct,
                    "nonce": pr_nonce,
                },
            ],
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already cast your ballot in this election",
        )

    return {
        "success": True,
        "ballot_id": ballot.id,
        "election_id": election_id,
        "message": (
            "Your dual ballot has been cast successfully. "
            "Both FPTP and PR votes were recorded."
        ),
    }


# ── Provincial ballot functions ──────────────────────────────────


def get_ballot_info_provincial(
    db: Session, election_id: int, voter: User
) -> dict:
    """Return ballot info for a PROVINCIAL election (FPTP + PR)."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status not in VOTER_VISIBLE_STATUSES:
        raise HTTPException(
            status_code=400, detail="Election is not available for viewing"
        )
    if election.government_level != "PROVINCIAL":
        raise HTTPException(
            status_code=400, detail="This is not a provincial election"
        )

    # ── voter's provincial area assignment ──────────────────────
    assignment = _get_voter_area_assignment(db, voter.id, "PROVINCIAL")
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You have not been assigned to a provincial constituency. Contact the election commission.",
        )

    area = db.get(AreaUnit, assignment.area_id)
    if not area:
        raise HTTPException(status_code=500, detail="Area unit record missing")

    # Verify province match
    if election.province_code != f"P{area.province_number}":
        raise HTTPException(
            status_code=400,
            detail="Your provincial assignment does not match this election's province",
        )

    # ── FPTP contest for voter's area ───────────────────────────
    fptp_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            ElectionContest.area_id == assignment.area_id,
        )
    ).scalar_one_or_none()
    if not fptp_contest:
        raise HTTPException(
            status_code=400,
            detail="No FPTP contest found for your provincial constituency in this election",
        )

    fptp_rows = db.execute(
        select(
            FptpCandidateNomination.id.label("nomination_id"),
            CandidateProfile.full_name.label("candidate_name"),
            CandidateProfile.photo_path.label("candidate_photo_path"),
            Party.name.label("party_name"),
            Party.abbreviation.label("party_abbreviation"),
            Party.symbol_path.label("party_symbol_path"),
        )
        .join(
            CandidateProfile,
            FptpCandidateNomination.candidate_id == CandidateProfile.id,
        )
        .outerjoin(Party, FptpCandidateNomination.party_id == Party.id)
        .where(
            FptpCandidateNomination.contest_id == fptp_contest.id,
            FptpCandidateNomination.status == "APPROVED",
        )
        .order_by(CandidateProfile.full_name)
    ).all()

    # ── PR contest (province-wide, one per provincial election) ─
    pr_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
        )
    ).scalar_one_or_none()
    if not pr_contest:
        raise HTTPException(
            status_code=400,
            detail="No PR contest found for this provincial election",
        )

    pr_rows = db.execute(
        select(
            Party.id.label("party_id"),
            Party.name.label("party_name"),
            Party.abbreviation.label("party_abbreviation"),
            Party.symbol_path.label("party_symbol_path"),
        )
        .join(PrPartySubmission, PrPartySubmission.party_id == Party.id)
        .where(
            PrPartySubmission.election_id == election_id,
            PrPartySubmission.status == "APPROVED",
        )
        .order_by(Party.name)
    ).all()

    already_voted = (
        ballot_repository.get_ballot(db, election_id, voter.id) is not None
    )

    return {
        "election_id": election.id,
        "election_title": election.title,
        "election_status": election.status,
        "government_level": "PROVINCIAL",
        "province_code": election.province_code,
        "polling_start_at": (
            election.polling_start_at.isoformat()
            if election.polling_start_at
            else None
        ),
        "polling_end_at": (
            election.polling_end_at.isoformat()
            if election.polling_end_at
            else None
        ),
        "voter_area": {
            "id": area.id,
            "code": area.code,
            "name": area.name,
            "province_number": area.province_number,
        },
        "fptp": {
            "contest_id": fptp_contest.id,
            "contest_title": fptp_contest.title,
            "candidates": [
                {
                    "nomination_id": r.nomination_id,
                    "candidate_name": r.candidate_name,
                    "candidate_photo_path": r.candidate_photo_path,
                    "party_name": r.party_name,
                    "party_abbreviation": r.party_abbreviation,
                    "party_symbol_path": r.party_symbol_path,
                }
                for r in fptp_rows
            ],
        },
        "pr": {
            "contest_id": pr_contest.id,
            "contest_title": pr_contest.title,
            "parties": [
                {
                    "party_id": r.party_id,
                    "party_name": r.party_name,
                    "party_abbreviation": r.party_abbreviation,
                    "party_symbol_path": r.party_symbol_path,
                }
                for r in pr_rows
            ],
        },
        "already_voted": already_voted,
    }


def cast_provincial_dual_ballot(
    db: Session,
    election_id: int,
    voter: User,
    fptp_nomination_id: int,
    pr_party_id: int,
) -> dict:
    """Cast a provincial dual ballot (FPTP + PR) atomically."""
    # 1 — voter eligibility
    if voter.role != "voter":
        raise HTTPException(status_code=403, detail="Only voters can cast ballots")
    if voter.status != "ACTIVE":
        raise HTTPException(
            status_code=403, detail="Your account is not active"
        )

    # 2 — election exists and is provincial
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.government_level != "PROVINCIAL":
        raise HTTPException(
            status_code=400, detail="This is not a provincial election"
        )

    # 3 — polling is open
    if election.status != "POLLING_OPEN":
        raise HTTPException(
            status_code=400,
            detail="This election is not currently open for voting",
        )

    # 4 — polling window enforcement
    now = datetime.now(timezone.utc)
    if election.polling_start_at and now < election.polling_start_at.replace(
        tzinfo=timezone.utc
    ):
        raise HTTPException(
            status_code=400, detail="Polling has not started yet"
        )
    if election.polling_end_at and now > election.polling_end_at.replace(
        tzinfo=timezone.utc
    ):
        raise HTTPException(status_code=400, detail="Polling has ended")

    # 5 — provincial area assignment
    assignment = _get_voter_area_assignment(db, voter.id, "PROVINCIAL")
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You have not been assigned to a provincial constituency",
        )

    area = db.get(AreaUnit, assignment.area_id)
    if not area:
        raise HTTPException(status_code=500, detail="Area unit record missing")

    # Province match
    if election.province_code != f"P{area.province_number}":
        raise HTTPException(
            status_code=400,
            detail="Your provincial assignment does not match this election's province",
        )

    # 6 — duplicate-vote prevention
    existing = ballot_repository.get_ballot(db, election_id, voter.id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already cast your ballot in this election",
        )

    # 7 — FPTP contest matches voter's area
    fptp_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            ElectionContest.area_id == assignment.area_id,
        )
    ).scalar_one_or_none()
    if not fptp_contest:
        raise HTTPException(
            status_code=400,
            detail="No FPTP contest found for your provincial constituency",
        )

    # 8 — FPTP nomination is approved for that contest
    fptp_nomination = db.execute(
        select(FptpCandidateNomination).where(
            FptpCandidateNomination.id == fptp_nomination_id,
            FptpCandidateNomination.contest_id == fptp_contest.id,
            FptpCandidateNomination.status == "APPROVED",
        )
    ).scalar_one_or_none()
    if not fptp_nomination:
        raise HTTPException(
            status_code=400,
            detail="Invalid FPTP candidate selection for your provincial constituency",
        )

    # 9 — PR contest (province-wide)
    pr_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
        )
    ).scalar_one_or_none()
    if not pr_contest:
        raise HTTPException(
            status_code=400,
            detail="No PR contest found for this provincial election",
        )

    # 10 — PR party has approved submission
    pr_submission = db.execute(
        select(PrPartySubmission).where(
            PrPartySubmission.election_id == election_id,
            PrPartySubmission.party_id == pr_party_id,
            PrPartySubmission.status == "APPROVED",
        )
    ).scalar_one_or_none()
    if not pr_submission:
        raise HTTPException(
            status_code=400, detail="Invalid PR party selection"
        )

    # 11 — encrypt both choices
    fptp_ct, fptp_nonce = _encrypt_choice(
        {"contest_id": fptp_contest.id, "nomination_id": fptp_nomination_id}
    )
    pr_ct, pr_nonce = _encrypt_choice(
        {"contest_id": pr_contest.id, "party_id": pr_party_id}
    )

    # 12 — atomic insert
    try:
        ballot = ballot_repository.create_ballot_with_entries(
            db,
            election_id=election_id,
            voter_id=voter.id,
            area_id=assignment.area_id,
            entries=[
                {
                    "contest_id": fptp_contest.id,
                    "ballot_type": CONTEST_TYPE_FPTP,
                    "encrypted_choice": fptp_ct,
                    "nonce": fptp_nonce,
                },
                {
                    "contest_id": pr_contest.id,
                    "ballot_type": CONTEST_TYPE_PR,
                    "encrypted_choice": pr_ct,
                    "nonce": pr_nonce,
                },
            ],
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already cast your ballot in this election",
        )

    return {
        "success": True,
        "ballot_id": ballot.id,
        "election_id": election_id,
        "message": (
            "Your provincial dual ballot has been cast successfully. "
            "Both FPTP and PR votes were recorded."
        ),
    }


# ── Level-dispatching wrappers ────────────────────────────────


def get_ballot_info_dispatch(
    db: Session, election_id: int, voter: User
) -> dict:
    """Route to the correct ballot-info builder based on election level."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.government_level == "PROVINCIAL":
        return get_ballot_info_provincial(db, election_id, voter)
    # Default: federal
    return get_ballot_info(db, election_id, voter)


def cast_dual_ballot_dispatch(
    db: Session,
    election_id: int,
    voter: User,
    fptp_nomination_id: int,
    pr_party_id: int,
) -> dict:
    """Route to the correct cast function based on election level."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.government_level == "PROVINCIAL":
        return cast_provincial_dual_ballot(
            db, election_id, voter, fptp_nomination_id, pr_party_id
        )
    # Default: federal
    return cast_dual_ballot(
        db,
        election_id=election_id,
        voter=voter,
        fptp_nomination_id=fptp_nomination_id,
        pr_party_id=pr_party_id,
    )
