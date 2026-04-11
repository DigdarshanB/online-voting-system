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
from app.core.election_constants import (
    CONTEST_TYPE_MAYOR,
    CONTEST_TYPE_DEPUTY_MAYOR,
    CONTEST_TYPE_WARD_CHAIR,
    CONTEST_TYPE_WARD_WOMAN_MEMBER,
    CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
    CONTEST_TYPE_WARD_MEMBER_OPEN,
    ALL_LOCAL_CONTEST_TYPES,
    LOCAL_HEAD_CONTEST_TYPES,
    LOCAL_WARD_CONTEST_TYPES,
)
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

    # Local — voter must be assigned to a ward within this election's scope
    if election.government_level == "LOCAL":
        assignment = _get_voter_area_assignment(db, voter_id, "LOCAL")
        if not assignment:
            return False
        ward = db.get(AreaUnit, assignment.area_id)
        if not ward or ward.category != "WARD":
            return False
        # The ward's parent local body must have a head contest in this election
        head_match = db.execute(
            select(ElectionContest.id).where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == CONTEST_TYPE_MAYOR,
                ElectionContest.area_id == AreaUnit.id,
                AreaUnit.code == ward.parent_code,
            )
        ).scalar_one_or_none()
        return head_match is not None

    return False


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
            "province_code": e.province_code,
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


# ── Local ballot functions ────────────────────────────────────


def _get_approved_nominations_for_contest(db: Session, contest_id: int) -> list:
    """Return approved nomination rows for a contest (id, name, photo, party info)."""
    return db.execute(
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
            FptpCandidateNomination.contest_id == contest_id,
            FptpCandidateNomination.status == "APPROVED",
        )
        .order_by(CandidateProfile.full_name)
    ).all()


def _format_candidates(rows) -> list[dict]:
    return [
        {
            "nomination_id": r.nomination_id,
            "candidate_name": r.candidate_name,
            "candidate_photo_path": r.candidate_photo_path,
            "party_name": r.party_name,
            "party_abbreviation": r.party_abbreviation,
            "party_symbol_path": r.party_symbol_path,
        }
        for r in rows
    ]


def get_ballot_info_local(db: Session, election_id: int, voter: User) -> dict:
    """Return ballot info for a LOCAL election (6 contests, 7 selections)."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.status not in VOTER_VISIBLE_STATUSES:
        raise HTTPException(
            status_code=400, detail="Election is not available for viewing"
        )
    if election.government_level != "LOCAL":
        raise HTTPException(
            status_code=400, detail="This is not a local election"
        )

    # ── voter's local area assignment (WARD) ────────────────────
    assignment = _get_voter_area_assignment(db, voter.id, "LOCAL")
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You have not been assigned to a ward. Contact the election commission.",
        )

    ward = db.get(AreaUnit, assignment.area_id)
    if not ward or ward.category != "WARD":
        raise HTTPException(
            status_code=500, detail="Ward assignment record is invalid"
        )

    # Find parent local body
    local_body = db.execute(
        select(AreaUnit).where(AreaUnit.code == ward.parent_code)
    ).scalar_one_or_none()
    if not local_body:
        raise HTTPException(
            status_code=500, detail="Local body record missing for assigned ward"
        )

    # ── Head contests (MAYOR / DEPUTY_MAYOR, scoped to local body) ──
    head_contests = {}
    for ct in (CONTEST_TYPE_MAYOR, CONTEST_TYPE_DEPUTY_MAYOR):
        contest = db.execute(
            select(ElectionContest).where(
                ElectionContest.election_id == election_id,
                ElectionContest.contest_type == ct,
                ElectionContest.area_id == local_body.id,
            )
        ).scalar_one_or_none()
        if contest:
            head_contests[ct] = contest

    if CONTEST_TYPE_MAYOR not in head_contests or CONTEST_TYPE_DEPUTY_MAYOR not in head_contests:
        raise HTTPException(
            status_code=400,
            detail="Head contests (Mayor and Deputy Mayor) not found for your local body in this election",
        )

    # ── Ward contests (scoped to voter's ward) ──────────────────
    ward_contests = {}
    for ct in (
        CONTEST_TYPE_WARD_CHAIR,
        CONTEST_TYPE_WARD_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_MEMBER_OPEN,
    ):
        contest = db.execute(
            select(ElectionContest).where(
                ElectionContest.election_id == election_id,
                ElectionContest.contest_type == ct,
                ElectionContest.area_id == ward.id,
            )
        ).scalar_one_or_none()
        if contest:
            ward_contests[ct] = contest

    # Build contest sections
    def _contest_section(contest):
        rows = _get_approved_nominations_for_contest(db, contest.id)
        return {
            "contest_id": contest.id,
            "contest_title": contest.title,
            "contest_type": contest.contest_type,
            "seat_count": contest.seat_count,
            "candidates": _format_candidates(rows),
        }

    already_voted = (
        ballot_repository.get_ballot(db, election_id, voter.id) is not None
    )

    result = {
        "election_id": election.id,
        "election_title": election.title,
        "election_status": election.status,
        "government_level": "LOCAL",
        "election_subtype": election.election_subtype,
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
        "local_body": {
            "id": local_body.id,
            "code": local_body.code,
            "name": local_body.name,
            "category": local_body.category,
            "province_number": local_body.province_number,
        },
        "ward": {
            "id": ward.id,
            "code": ward.code,
            "name": ward.name,
            "ward_number": ward.ward_number,
        },
        "already_voted": already_voted,
    }

    # Add head contests
    for ct, key in (
        (CONTEST_TYPE_MAYOR, "head"),
        (CONTEST_TYPE_DEPUTY_MAYOR, "deputy_head"),
    ):
        if ct in head_contests:
            result[key] = _contest_section(head_contests[ct])
        else:
            result[key] = None

    # Add ward contests
    for ct, key in (
        (CONTEST_TYPE_WARD_CHAIR, "ward_chair"),
        (CONTEST_TYPE_WARD_WOMAN_MEMBER, "ward_woman_member"),
        (CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER, "ward_dalit_woman_member"),
        (CONTEST_TYPE_WARD_MEMBER_OPEN, "ward_member_open"),
    ):
        if ct in ward_contests:
            result[key] = _contest_section(ward_contests[ct])
        else:
            result[key] = None

    # Validate all 6 contest sections are present
    for key in ("head", "deputy_head", "ward_chair", "ward_woman_member",
                "ward_dalit_woman_member", "ward_member_open"):
        if result.get(key) is None:
            raise HTTPException(
                status_code=400,
                detail=f"Incomplete local ballot structure ({key} contest missing); contact the election commission",
            )

    return result


def cast_local_ballot(
    db: Session,
    election_id: int,
    voter: User,
    selections: dict,
) -> dict:
    """Cast a local ballot (6 contests, 7 selections) atomically.

    selections must contain:
      head_nomination_id: int
      deputy_head_nomination_id: int
      ward_chair_nomination_id: int
      ward_woman_member_nomination_id: int
      ward_dalit_woman_member_nomination_id: int
      ward_member_open_nomination_ids: [int, int]  (two distinct)
    """
    # 1 — voter eligibility
    if voter.role != "voter":
        raise HTTPException(status_code=403, detail="Only voters can cast ballots")
    if voter.status != "ACTIVE":
        raise HTTPException(
            status_code=403, detail="Your account is not active"
        )

    # 2 — election exists and is local
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.government_level != "LOCAL":
        raise HTTPException(
            status_code=400, detail="This is not a local election"
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

    # 5 — local area assignment (WARD)
    assignment = _get_voter_area_assignment(db, voter.id, "LOCAL")
    if not assignment:
        raise HTTPException(
            status_code=400,
            detail="You have not been assigned to a ward",
        )

    ward = db.get(AreaUnit, assignment.area_id)
    if not ward or ward.category != "WARD":
        raise HTTPException(status_code=500, detail="Ward assignment invalid")

    local_body = db.execute(
        select(AreaUnit).where(AreaUnit.code == ward.parent_code)
    ).scalar_one_or_none()
    if not local_body:
        raise HTTPException(
            status_code=500, detail="Local body record missing"
        )

    # 6 — duplicate-vote prevention
    existing = ballot_repository.get_ballot(db, election_id, voter.id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already cast your ballot in this election",
        )

    # 7 — validate all seven selections are present
    required_keys = [
        "head_nomination_id",
        "deputy_head_nomination_id",
        "ward_chair_nomination_id",
        "ward_woman_member_nomination_id",
        "ward_dalit_woman_member_nomination_id",
        "ward_member_open_nomination_ids",
    ]
    for key in required_keys:
        if key not in selections or selections[key] is None:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required selection: {key}",
            )

    open_ids = selections["ward_member_open_nomination_ids"]
    if not isinstance(open_ids, list) or len(open_ids) != 2:
        raise HTTPException(
            status_code=400,
            detail="ward_member_open_nomination_ids must be a list of exactly 2 candidate IDs",
        )
    if open_ids[0] == open_ids[1]:
        raise HTTPException(
            status_code=400,
            detail="The two open ward member selections must be different candidates",
        )

    # 8 — resolve contests and validate each nomination

    # Map: (contest_type, area_id) → look up
    single_seat_checks = [
        (CONTEST_TYPE_MAYOR, local_body.id, selections["head_nomination_id"]),
        (CONTEST_TYPE_DEPUTY_MAYOR, local_body.id, selections["deputy_head_nomination_id"]),
        (CONTEST_TYPE_WARD_CHAIR, ward.id, selections["ward_chair_nomination_id"]),
        (CONTEST_TYPE_WARD_WOMAN_MEMBER, ward.id, selections["ward_woman_member_nomination_id"]),
        (CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER, ward.id, selections["ward_dalit_woman_member_nomination_id"]),
    ]

    entries = []

    for contest_type, area_id, nomination_id in single_seat_checks:
        contest = db.execute(
            select(ElectionContest).where(
                ElectionContest.election_id == election_id,
                ElectionContest.contest_type == contest_type,
                ElectionContest.area_id == area_id,
            )
        ).scalar_one_or_none()
        if not contest:
            raise HTTPException(
                status_code=400,
                detail=f"No {contest_type} contest found for your area",
            )

        nomination = db.execute(
            select(FptpCandidateNomination).where(
                FptpCandidateNomination.id == nomination_id,
                FptpCandidateNomination.contest_id == contest.id,
                FptpCandidateNomination.status == "APPROVED",
            )
        ).scalar_one_or_none()
        if not nomination:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid candidate selection for {contest_type}",
            )

        ct, nonce = _encrypt_choice(
            {"contest_id": contest.id, "nomination_id": nomination_id}
        )
        entries.append({
            "contest_id": contest.id,
            "ballot_type": contest_type,
            "encrypted_choice": ct,
            "nonce": nonce,
        })

    # WARD_MEMBER_OPEN (2 selections from one contest)
    open_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_WARD_MEMBER_OPEN,
            ElectionContest.area_id == ward.id,
        )
    ).scalar_one_or_none()
    if not open_contest:
        raise HTTPException(
            status_code=400,
            detail="No ward member open contest found for your ward",
        )

    for nom_id in open_ids:
        nomination = db.execute(
            select(FptpCandidateNomination).where(
                FptpCandidateNomination.id == nom_id,
                FptpCandidateNomination.contest_id == open_contest.id,
                FptpCandidateNomination.status == "APPROVED",
            )
        ).scalar_one_or_none()
        if not nomination:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid candidate selection for WARD_MEMBER_OPEN (nomination {nom_id})",
            )

    # Store open-member as a single entry with both nomination_ids
    open_ct, open_nonce = _encrypt_choice(
        {
            "contest_id": open_contest.id,
            "nomination_ids": open_ids,
        }
    )
    entries.append({
        "contest_id": open_contest.id,
        "ballot_type": CONTEST_TYPE_WARD_MEMBER_OPEN,
        "encrypted_choice": open_ct,
        "nonce": open_nonce,
    })

    # 9 — atomic insert (6 entries in one transaction)
    try:
        ballot = ballot_repository.create_ballot_with_entries(
            db,
            election_id=election_id,
            voter_id=voter.id,
            area_id=ward.id,
            entries=entries,
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
            "Your local ballot has been cast successfully. "
            "All seven selections were recorded."
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
    if election.government_level == "LOCAL":
        return get_ballot_info_local(db, election_id, voter)
    # Default: federal
    return get_ballot_info(db, election_id, voter)


def cast_dual_ballot_dispatch(
    db: Session,
    election_id: int,
    voter: User,
    fptp_nomination_id: int,
    pr_party_id: int,
) -> dict:
    """Route to the correct cast function based on election level (federal/provincial)."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.government_level == "LOCAL":
        raise HTTPException(
            status_code=400,
            detail="Local elections use the dedicated local cast endpoint",
        )
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


def cast_local_ballot_dispatch(
    db: Session,
    election_id: int,
    voter: User,
    selections: dict,
) -> dict:
    """Dispatch to local cast function after verifying level."""
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    if election.government_level != "LOCAL":
        raise HTTPException(
            status_code=400,
            detail="This endpoint is only for local elections",
        )
    return cast_local_ballot(db, election_id, voter, selections)


# ── Voter-scoped nominated candidates by election family ─────


def _get_approved_pr_parties(db: Session, election_id: int) -> list[dict]:
    """Return approved PR party submissions for an election."""
    rows = db.execute(
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
    return [
        {
            "party_id": r.party_id,
            "party_name": r.party_name,
            "party_abbreviation": r.party_abbreviation,
            "party_symbol_path": r.party_symbol_path,
        }
        for r in rows
    ]


def get_eligible_nominations_by_family(
    db: Session, voter: User, government_level: str
) -> dict:
    """Return nominated candidates the voter is eligible to see for a given
    election family (FEDERAL / PROVINCIAL / LOCAL).

    Reuses the same eligibility logic as list_voter_elections and the same
    nomination-fetching pattern as get_ballot_info*.
    Only APPROVED nominations from elections in VOTER_VISIBLE_STATUSES.
    """
    valid_levels = ("FEDERAL", "PROVINCIAL", "LOCAL")
    if government_level not in valid_levels:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid election family. Must be one of {valid_levels}",
        )

    # ── Find eligible elections for this family ──────────────────
    elections = (
        db.execute(
            select(Election).where(
                Election.status.in_(VOTER_VISIBLE_STATUSES),
                Election.government_level == government_level,
            )
            .order_by(Election.polling_start_at.desc(), Election.created_at.desc())
        )
        .scalars()
        .all()
    )

    voter_constituency_id = _get_voter_constituency_id(db, voter.id)

    eligible_elections = [
        e
        for e in elections
        if _is_eligible_for_election(db, e, voter.id, voter_constituency_id)
    ]

    if not eligible_elections:
        return {
            "government_level": government_level,
            "voter_area": None,
            "elections": [],
        }

    # ── Resolve voter area info ──────────────────────────────────
    voter_area_info = None

    if government_level == "FEDERAL":
        if voter_constituency_id:
            constituency = db.execute(
                select(Constituency)
                .options(joinedload(Constituency.district))
                .where(Constituency.id == voter_constituency_id)
            ).unique().scalar_one_or_none()
            if constituency:
                voter_area_info = {
                    "type": "constituency",
                    "name": constituency.name,
                    "district_name": (
                        constituency.district.name
                        if constituency.district
                        else None
                    ),
                }

    elif government_level == "PROVINCIAL":
        assignment = _get_voter_area_assignment(db, voter.id, "PROVINCIAL")
        if assignment:
            area = db.get(AreaUnit, assignment.area_id)
            if area:
                voter_area_info = {
                    "type": "provincial_constituency",
                    "name": area.name,
                    "code": area.code,
                    "province_number": area.province_number,
                }

    elif government_level == "LOCAL":
        assignment = _get_voter_area_assignment(db, voter.id, "LOCAL")
        if assignment:
            ward = db.get(AreaUnit, assignment.area_id)
            if ward:
                local_body = db.execute(
                    select(AreaUnit).where(AreaUnit.code == ward.parent_code)
                ).scalar_one_or_none()
                voter_area_info = {
                    "type": "ward",
                    "ward_name": ward.name,
                    "ward_number": ward.ward_number,
                    "local_body_name": local_body.name if local_body else None,
                    "local_body_category": local_body.category if local_body else None,
                    "province_number": ward.province_number,
                }

    # ── Build nominations per eligible election ──────────────────
    result_elections = []

    for election in eligible_elections:
        election_data = {
            "id": election.id,
            "title": election.title,
            "status": election.status,
            "election_subtype": election.election_subtype,
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
            "contests": [],
        }

        if government_level == "FEDERAL":
            _build_federal_contests(db, election, voter_constituency_id, election_data)
        elif government_level == "PROVINCIAL":
            _build_provincial_contests(db, election, voter, election_data)
        elif government_level == "LOCAL":
            _build_local_contests(db, election, voter, election_data)

        result_elections.append(election_data)

    return {
        "government_level": government_level,
        "voter_area": voter_area_info,
        "elections": result_elections,
    }


def _build_federal_contests(
    db: Session, election: Election, voter_constituency_id: int, out: dict
) -> None:
    """Append FPTP + PR contest data for a federal election."""
    # FPTP for voter's constituency
    fptp_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election.id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            ElectionContest.constituency_id == voter_constituency_id,
        )
    ).scalar_one_or_none()

    if fptp_contest:
        rows = _get_approved_nominations_for_contest(db, fptp_contest.id)
        out["contests"].append({
            "contest_id": fptp_contest.id,
            "contest_type": CONTEST_TYPE_FPTP,
            "contest_title": fptp_contest.title,
            "seat_count": fptp_contest.seat_count,
            "candidates": _format_candidates(rows),
        })

    # PR (nationwide)
    pr_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election.id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
            ElectionContest.constituency_id.is_(None),
        )
    ).scalar_one_or_none()

    if pr_contest:
        out["contests"].append({
            "contest_id": pr_contest.id,
            "contest_type": CONTEST_TYPE_PR,
            "contest_title": pr_contest.title,
            "seat_count": pr_contest.seat_count,
            "parties": _get_approved_pr_parties(db, election.id),
        })


def _build_provincial_contests(
    db: Session, election: Election, voter: User, out: dict
) -> None:
    """Append FPTP + PR contest data for a provincial election."""
    assignment = _get_voter_area_assignment(db, voter.id, "PROVINCIAL")
    if not assignment:
        return

    # FPTP for voter's provincial constituency
    fptp_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election.id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
            ElectionContest.area_id == assignment.area_id,
        )
    ).scalar_one_or_none()

    if fptp_contest:
        rows = _get_approved_nominations_for_contest(db, fptp_contest.id)
        out["contests"].append({
            "contest_id": fptp_contest.id,
            "contest_type": CONTEST_TYPE_FPTP,
            "contest_title": fptp_contest.title,
            "seat_count": fptp_contest.seat_count,
            "candidates": _format_candidates(rows),
        })

    # PR (province-wide)
    pr_contest = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election.id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
        )
    ).scalar_one_or_none()

    if pr_contest:
        out["contests"].append({
            "contest_id": pr_contest.id,
            "contest_type": CONTEST_TYPE_PR,
            "contest_title": pr_contest.title,
            "seat_count": pr_contest.seat_count,
            "parties": _get_approved_pr_parties(db, election.id),
        })


def _build_local_contests(
    db: Session, election: Election, voter: User, out: dict
) -> None:
    """Append all 6 contest types for a local election."""
    assignment = _get_voter_area_assignment(db, voter.id, "LOCAL")
    if not assignment:
        return

    ward = db.get(AreaUnit, assignment.area_id)
    if not ward or ward.category != "WARD":
        return

    local_body = db.execute(
        select(AreaUnit).where(AreaUnit.code == ward.parent_code)
    ).scalar_one_or_none()
    if not local_body:
        return

    # Head contests (scoped to local body)
    for ct in (CONTEST_TYPE_MAYOR, CONTEST_TYPE_DEPUTY_MAYOR):
        contest = db.execute(
            select(ElectionContest).where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == ct,
                ElectionContest.area_id == local_body.id,
            )
        ).scalar_one_or_none()
        if contest:
            rows = _get_approved_nominations_for_contest(db, contest.id)
            out["contests"].append({
                "contest_id": contest.id,
                "contest_type": ct,
                "contest_title": contest.title,
                "seat_count": contest.seat_count,
                "candidates": _format_candidates(rows),
            })

    # Ward contests (scoped to voter's ward)
    for ct in (
        CONTEST_TYPE_WARD_CHAIR,
        CONTEST_TYPE_WARD_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
        CONTEST_TYPE_WARD_MEMBER_OPEN,
    ):
        contest = db.execute(
            select(ElectionContest).where(
                ElectionContest.election_id == election.id,
                ElectionContest.contest_type == ct,
                ElectionContest.area_id == ward.id,
            )
        ).scalar_one_or_none()
        if contest:
            rows = _get_approved_nominations_for_contest(db, contest.id)
            out["contests"].append({
                "contest_id": contest.id,
                "contest_type": ct,
                "contest_title": contest.title,
                "seat_count": contest.seat_count,
                "candidates": _format_candidates(rows),
            })
