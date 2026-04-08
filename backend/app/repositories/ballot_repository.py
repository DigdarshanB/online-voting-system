from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.ballot import Ballot
from app.models.ballot_entry import BallotEntry


def get_ballot(db: Session, election_id: int, voter_id: int) -> Ballot | None:
    return db.execute(
        select(Ballot).where(
            Ballot.election_id == election_id,
            Ballot.voter_id == voter_id,
        )
    ).scalar_one_or_none()


def get_voted_election_ids(db: Session, voter_id: int) -> set[int]:
    rows = db.execute(
        select(Ballot.election_id).where(Ballot.voter_id == voter_id)
    ).scalars().all()
    return set(rows)


def create_ballot_with_entries(
    db: Session,
    *,
    election_id: int,
    voter_id: int,
    constituency_id: int,
    entries: list[dict],
) -> Ballot:
    ballot = Ballot(
        election_id=election_id,
        voter_id=voter_id,
        constituency_id=constituency_id,
    )
    db.add(ballot)
    db.flush()

    for entry_data in entries:
        entry = BallotEntry(
            ballot_id=ballot.id,
            contest_id=entry_data["contest_id"],
            ballot_type=entry_data["ballot_type"],
            encrypted_choice=entry_data["encrypted_choice"],
            nonce=entry_data["nonce"],
        )
        db.add(entry)
    db.flush()
    return ballot


def count_ballots(db: Session, election_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(Ballot).where(
            Ballot.election_id == election_id
        )
    ).scalar() or 0
