"""Pydantic schemas for count runs and results."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


# ── Count Run ───────────────────────────────────────────────────


class CountRunRead(BaseModel):
    id: int
    election_id: int
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_by: int
    error_message: str | None = None
    total_ballots_counted: int | None = None
    total_fptp_adjudication: int = 0
    total_pr_adjudication: int = 0
    is_final: bool = False
    is_locked: bool = False

    class Config:
        from_attributes = True


# ── FPTP Result Row ─────────────────────────────────────────────


class FptpResultRowRead(BaseModel):
    id: int
    count_run_id: int
    contest_id: int
    nomination_id: int
    candidate_name: str
    party_name: str | None = None
    vote_count: int = 0
    rank: int = 0
    is_winner: bool = False
    requires_adjudication: bool = False

    class Config:
        from_attributes = True


# ── PR Result Row ───────────────────────────────────────────────


class PrResultRowRead(BaseModel):
    id: int
    count_run_id: int
    party_id: int
    party_name: str
    valid_votes: int = 0
    vote_share_pct: float = 0.0
    meets_threshold: bool = False
    allocated_seats: int = 0
    highest_quotient_numerator: int | None = None
    highest_quotient_divisor: int | None = None
    requires_adjudication: bool = False

    class Config:
        from_attributes = True


# ── Result Summary ──────────────────────────────────────────────


class FptpSummary(BaseModel):
    total_contests: int
    winners_declared: int
    adjudication_required: int


class PrSummary(BaseModel):
    total_valid_votes: int
    parties_qualified: int
    seats_allocated: int
    total_seats: int
    adjudication_required: int


class ResultSummary(BaseModel):
    count_run_id: int
    election_id: int
    status: str
    is_final: bool
    is_locked: bool
    total_ballots_counted: int | None = None
    fptp: FptpSummary
    pr: PrSummary
    can_finalize: bool
    started_at: str | None = None
    completed_at: str | None = None
