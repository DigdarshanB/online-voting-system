from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.candidate_profile import CandidateProfile
from app.models.fptp_candidate_nomination import FptpCandidateNomination
from app.models.pr_party_submission import PrPartySubmission
from app.models.pr_party_list_entry import PrPartyListEntry


# ── Candidate profiles ──────────────────────────────────────────

def get_profile_by_id(db: Session, profile_id: int) -> CandidateProfile | None:
    return db.execute(
        select(CandidateProfile).where(CandidateProfile.id == profile_id)
    ).scalar_one_or_none()


def list_profiles(
    db: Session,
    *,
    limit: int = 200,
    offset: int = 0,
    party_id: int | None = None,
    active_only: bool = False,
    government_level: str | None = None,
) -> list[CandidateProfile]:
    q = select(CandidateProfile).order_by(CandidateProfile.full_name)
    if party_id is not None:
        q = q.where(CandidateProfile.party_id == party_id)
    if active_only:
        q = q.where(CandidateProfile.is_active == True)  # noqa: E712
    if government_level is not None:
        q = q.where(CandidateProfile.government_level == government_level)
    return list(db.execute(q.limit(limit).offset(offset)).scalars().all())


def count_profiles(db: Session, *, party_id: int | None = None, active_only: bool = False) -> int:
    q = select(func.count()).select_from(CandidateProfile)
    if party_id is not None:
        q = q.where(CandidateProfile.party_id == party_id)
    if active_only:
        q = q.where(CandidateProfile.is_active == True)  # noqa: E712
    return db.execute(q).scalar_one()


def create_profile(db: Session, profile: CandidateProfile) -> CandidateProfile:
    db.add(profile)
    db.flush()
    return profile


def delete_profile(db: Session, profile: CandidateProfile) -> None:
    db.delete(profile)
    db.flush()


# ── FPTP nominations ────────────────────────────────────────────

def get_nomination_by_id(db: Session, nomination_id: int) -> FptpCandidateNomination | None:
    return db.execute(
        select(FptpCandidateNomination).where(FptpCandidateNomination.id == nomination_id)
    ).scalar_one_or_none()


def list_nominations(
    db: Session,
    election_id: int,
    *,
    contest_id: int | None = None,
    status: str | None = None,
    limit: int = 500,
    offset: int = 0,
) -> list[FptpCandidateNomination]:
    q = (
        select(FptpCandidateNomination)
        .where(FptpCandidateNomination.election_id == election_id)
        .order_by(FptpCandidateNomination.contest_id, FptpCandidateNomination.id)
    )
    if contest_id is not None:
        q = q.where(FptpCandidateNomination.contest_id == contest_id)
    if status is not None:
        q = q.where(FptpCandidateNomination.status == status)
    return list(db.execute(q.limit(limit).offset(offset)).scalars().all())


def count_nominations(
    db: Session, election_id: int, *, contest_id: int | None = None, status: str | None = None,
) -> int:
    q = (
        select(func.count())
        .select_from(FptpCandidateNomination)
        .where(FptpCandidateNomination.election_id == election_id)
    )
    if contest_id is not None:
        q = q.where(FptpCandidateNomination.contest_id == contest_id)
    if status is not None:
        q = q.where(FptpCandidateNomination.status == status)
    return db.execute(q).scalar_one()


def count_nominations_grouped_by_status(db: Session, election_id: int) -> dict[str, int]:
    rows = db.execute(
        select(FptpCandidateNomination.status, func.count(FptpCandidateNomination.id))
        .where(FptpCandidateNomination.election_id == election_id)
        .group_by(FptpCandidateNomination.status)
    ).all()
    return {status: int(cnt) for status, cnt in rows}


def delete_nomination(db: Session, nomination: FptpCandidateNomination) -> None:
    db.delete(nomination)
    db.flush()


# ── PR submissions ──────────────────────────────────────────────

def get_submission_by_id(db: Session, submission_id: int) -> PrPartySubmission | None:
    return db.execute(
        select(PrPartySubmission).where(PrPartySubmission.id == submission_id)
    ).scalar_one_or_none()


def get_submission_by_election_party(
    db: Session, election_id: int, party_id: int,
) -> PrPartySubmission | None:
    return db.execute(
        select(PrPartySubmission).where(
            PrPartySubmission.election_id == election_id,
            PrPartySubmission.party_id == party_id,
        )
    ).scalar_one_or_none()


def list_submissions(
    db: Session, election_id: int, *, limit: int = 200, offset: int = 0,
) -> list[PrPartySubmission]:
    return list(
        db.execute(
            select(PrPartySubmission)
            .where(PrPartySubmission.election_id == election_id)
            .order_by(PrPartySubmission.party_id)
            .limit(limit).offset(offset)
        ).scalars().all()
    )


def delete_submission(db: Session, submission: PrPartySubmission) -> None:
    db.delete(submission)
    db.flush()


# ── PR list entries ─────────────────────────────────────────────

def get_entry_by_id(db: Session, entry_id: int) -> PrPartyListEntry | None:
    return db.execute(
        select(PrPartyListEntry).where(PrPartyListEntry.id == entry_id)
    ).scalar_one_or_none()


def list_entries(db: Session, submission_id: int) -> list[PrPartyListEntry]:
    return list(
        db.execute(
            select(PrPartyListEntry)
            .where(PrPartyListEntry.submission_id == submission_id)
            .order_by(PrPartyListEntry.list_position)
        ).scalars().all()
    )


def count_entries(db: Session, submission_id: int) -> int:
    return db.execute(
        select(func.count())
        .select_from(PrPartyListEntry)
        .where(PrPartyListEntry.submission_id == submission_id)
    ).scalar_one()


def delete_entry(db: Session, entry: PrPartyListEntry) -> None:
    db.delete(entry)
    db.flush()


def delete_all_entries(db: Session, submission_id: int) -> int:
    entries = list_entries(db, submission_id)
    for e in entries:
        db.delete(e)
    db.flush()
    return len(entries)
