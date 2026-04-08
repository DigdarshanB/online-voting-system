"""Pending voter registration – holds registration data until admin approval.

A row here does NOT represent a real voter account. It only becomes a real
``User`` after the full verification pipeline completes and an admin approves.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PendingVoterRegistration(Base):
    __tablename__ = "pending_voter_registrations"

    id: Mapped[int] = mapped_column(primary_key=True)

    # ── Identity fields (mirror users table) ────────────────────
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    citizenship_no_raw: Mapped[str] = mapped_column(String(50), nullable=False)
    citizenship_no_normalized: Mapped[str] = mapped_column(
        String(16), nullable=False, unique=True, index=True,
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Email verification ──────────────────────────────────────
    email_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── TOTP (authenticator app) verification ───────────────────
    totp_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Document verification ───────────────────────────────────
    citizenship_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Face verification ───────────────────────────────────────
    face_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    face_uploaded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ── Overall workflow status ─────────────────────────────────
    # PENDING_EMAIL → PENDING_DOCUMENT → PENDING_FACE → PENDING_REVIEW
    #   → APPROVED (converted to user) | REJECTED | EXPIRED
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="PENDING_EMAIL",
    )

    # ── Admin review ────────────────────────────────────────────
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    converted_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True,
    )

    # ── Audit timestamps ────────────────────────────────────────
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now(),
    )
