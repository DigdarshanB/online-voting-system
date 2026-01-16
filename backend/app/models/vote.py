from datetime import datetime
from sqlalchemy import ForeignKey, DateTime, LargeBinary, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[int] = mapped_column(primary_key=True)
    election_id: Mapped[int] = mapped_column(ForeignKey("elections.id"), index=True)
    voter_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    encrypted_vote: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("election_id", "voter_id", name="uq_vote_once_per_election"),
    )
