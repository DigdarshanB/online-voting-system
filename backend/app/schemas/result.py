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
    candidate_photo_path: str | None = None
    party_symbol_path: str | None = None

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
    party_symbol_path: str | None = None

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


# ── PR Elected Member ──────────────────────────────────────────


class PrElectedMemberRead(BaseModel):
    id: int
    count_run_id: int
    contest_id: int
    party_id: int
    candidate_id: int
    list_entry_id: int | None = None
    seat_number: int
    candidate_name: str
    party_name: str
    elected_at: datetime | None = None
    candidate_photo_path: str | None = None
    party_symbol_path: str | None = None

    class Config:
        from_attributes = True


# ── Assembly Composition ────────────────────────────────────────


class AssemblyPartyComposition(BaseModel):
    party_name: str
    fptp_seats: int = 0
    pr_seats: int = 0
    total_seats: int = 0


class ProvincialResultSummary(ResultSummary):
    """Extended summary for provincial elections with assembly composition."""
    government_level: str | None = None
    province_code: str | None = None
    election_title: str | None = None
    pr_elected_members_count: int = 0
    assembly_composition: list[AssemblyPartyComposition] = []
    assembly_total_seats: int = 0
    assembly_seats_filled: int = 0


# ── Local Result Summary ────────────────────────────────────────


class LocalContestCandidate(BaseModel):
    nomination_id: int
    candidate_name: str
    party_name: str | None = None
    vote_count: int = 0
    rank: int = 0
    is_winner: bool = False
    requires_adjudication: bool = False


class LocalContestResult(BaseModel):
    contest_id: int
    contest_type: str
    contest_title: str
    area_name: str | None = None
    seat_count: int = 1
    candidates: list[LocalContestCandidate] = []


class LocalWardResult(BaseModel):
    area_id: int
    ward_name: str
    ward_number: int | None = None
    contests: list[LocalContestResult] = []


class LocalSummaryTotals(BaseModel):
    total_direct_contests: int = 0
    total_seats: int = 0
    seats_filled: int = 0
    adjudication_required: int = 0
    wards_counted: int = 0


class LocalResultSummary(ResultSummary):
    """Extended summary for local elections with head/ward breakdowns."""
    government_level: str | None = None
    election_title: str | None = None
    election_subtype: str | None = None
    head_results: list[LocalContestResult] = []
    ward_results: list[LocalWardResult] = []
    local_summary: LocalSummaryTotals | None = None
