from sqlalchemy import ForeignKey, LargeBinary, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BallotEntry(Base):
    """A single line-item on a dual ballot — one FPTP entry and one PR entry.

    encrypted_choice  : AES-256-GCM ciphertext (contains JSON payload)
    nonce             : 12-byte GCM nonce used for that entry
    ballot_type       : "FPTP" or "PR"
    contest_id        : points to the specific election_contest
    """

    __tablename__ = "ballot_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    ballot_id: Mapped[int] = mapped_column(
        ForeignKey("ballots.id", name="fk_be_ballot"),
        nullable=False,
        index=True,
    )
    contest_id: Mapped[int] = mapped_column(
        ForeignKey("election_contests.id", name="fk_be_contest"),
        nullable=False,
        index=True,
    )
    ballot_type: Mapped[str] = mapped_column(String(10), nullable=False)
    encrypted_choice: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "ballot_id", "ballot_type",
            name="uq_one_entry_per_ballot_type",
        ),
    )
