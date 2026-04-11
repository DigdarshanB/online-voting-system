"""Pydantic schemas for candidate profiles, FPTP nominations, and PR submissions."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Candidate profiles ──────────────────────────────────────────

class CandidateProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    date_of_birth: date | None = None
    gender: str | None = Field(None, pattern="^(MALE|FEMALE|OTHER)$")
    address: str | None = None
    citizenship_no: str | None = None
    photo_path: str | None = None
    qualifications: str | None = None
    party_id: int | None = None


class CandidateProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=255)
    date_of_birth: date | None = None
    gender: str | None = Field(None, pattern="^(MALE|FEMALE|OTHER)$")
    address: str | None = None
    citizenship_no: str | None = None
    photo_path: str | None = None
    qualifications: str | None = None
    party_id: int | None = None
    is_active: bool | None = None


class CandidateProfileRead(BaseModel):
    id: int
    full_name: str
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    citizenship_no: str | None = None
    photo_path: str | None = None
    qualifications: str | None = None
    party_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── FPTP nominations ────────────────────────────────────────────

class FptpNominationCreate(BaseModel):
    contest_id: int
    candidate_id: int
    party_id: int | None = None


class FptpNominationStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(APPROVED|REJECTED|WITHDRAWN)$")
    notes: str | None = None


class FptpNominationRead(BaseModel):
    id: int
    election_id: int
    contest_id: int
    candidate_id: int
    party_id: int | None = None
    status: str
    nominated_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by: int | None = None
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── PR submissions ──────────────────────────────────────────────

class PrSubmissionCreate(BaseModel):
    party_id: int


class PrSubmissionRead(BaseModel):
    id: int
    election_id: int
    party_id: int
    status: str
    submitted_at: datetime | None = None
    validated_at: datetime | None = None
    reviewed_at: datetime | None = None
    reviewed_by: int | None = None
    validation_snapshot: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PrSubmissionReviewAction(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|reopen)$")
    notes: str | None = None


# ── PR list entries ─────────────────────────────────────────────

class PrEntryCreate(BaseModel):
    candidate_id: int
    list_position: int = Field(..., ge=1)


class PrEntryRead(BaseModel):
    id: int
    submission_id: int
    candidate_id: int
    list_position: int
    created_at: datetime

    class Config:
        from_attributes = True


class PrReorderRequest(BaseModel):
    ordered_candidate_ids: list[int]


# ── Validation result ───────────────────────────────────────────

class PrValidationResult(BaseModel):
    valid: bool
    errors: list[dict[str, Any]]
    warnings: list[dict[str, Any]]
    summary: dict[str, Any]


# ── Candidate readiness ────────────────────────────────────────

class CandidateReadiness(BaseModel):
    ready: bool
    issues: list[str]
    contest_types: list[str] = []
    # Dynamic detail fields: {contest_type}_contests_total, {contest_type}_contests_filled,
    # pr_submissions_total, pr_submissions_valid, etc.
    # Using model_config to allow extra fields from the service dict.

    class Config:
        from_attributes = True
        extra = "allow"
