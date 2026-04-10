"""Pydantic schemas for election management endpoints."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


# ── Valid (government_level, election_subtype) combinations ─────

VALID_LEVEL_SUBTYPE_PAIRS = {
    ("FEDERAL", "HOR_DIRECT"),
    ("PROVINCIAL", "PROVINCIAL_ASSEMBLY"),
    ("LOCAL", "LOCAL_MUNICIPAL"),
    ("LOCAL", "LOCAL_RURAL"),
}


# ── Election CRUD ───────────────────────────────────────────────

_VALID_PROVINCE_CODES = {"P1", "P2", "P3", "P4", "P5", "P6", "P7"}


class ElectionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    government_level: str = Field(..., pattern="^(FEDERAL|PROVINCIAL|LOCAL)$")
    election_subtype: str = Field(..., pattern="^(HOR_DIRECT|PROVINCIAL_ASSEMBLY|LOCAL_MUNICIPAL|LOCAL_RURAL)$")
    # province_code is required for PROVINCIAL elections, must be null for all others.
    province_code: str | None = Field(None, pattern="^P[1-7]$")
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def validate_level_subtype(self) -> "ElectionCreate":
        pair = (self.government_level, self.election_subtype)
        if pair not in VALID_LEVEL_SUBTYPE_PAIRS:
            raise ValueError(
                f"Invalid combination: {self.government_level}/{self.election_subtype}. "
                f"Valid: {', '.join(f'{l}/{s}' for l, s in sorted(VALID_LEVEL_SUBTYPE_PAIRS))}"
            )
        return self

    @model_validator(mode="after")
    def validate_province_code(self) -> "ElectionCreate":
        if self.government_level == "PROVINCIAL":
            if not self.province_code:
                raise ValueError(
                    "province_code is required for PROVINCIAL elections (e.g. 'P1' through 'P7')"
                )
            if self.province_code not in _VALID_PROVINCE_CODES:
                raise ValueError(
                    f"province_code must be one of: {', '.join(sorted(_VALID_PROVINCE_CODES))}"
                )
        else:
            if self.province_code is not None:
                raise ValueError(
                    "province_code must only be set for PROVINCIAL elections"
                )
        return self


class ElectionUpdate(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None


class ElectionRead(BaseModel):
    id: int
    title: str
    description: str | None = None
    election_type: str
    status: str
    government_level: str | None = None
    election_subtype: str | None = None
    province_code: str | None = None
    scope_area_id: int | None = None
    start_time: datetime
    end_time: datetime
    nomination_open_at: datetime | None = None
    nomination_close_at: datetime | None = None
    candidate_list_publish_at: datetime | None = None
    polling_start_at: datetime | None = None
    polling_end_at: datetime | None = None
    counting_start_at: datetime | None = None
    result_publish_at: datetime | None = None
    result_visible_from: datetime | None = None
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ElectionSummary(BaseModel):
    id: int
    title: str
    status: str
    government_level: str | None = None
    election_subtype: str | None = None
    province_code: str | None = None
    scope_area_id: int | None = None
    start_time: datetime
    end_time: datetime
    contest_count: int = 0
    fptp_count: int = 0
    pr_count: int = 0
    contest_counts: dict[str, int] = {}  # {contest_type: count} for all types
    created_at: datetime

    class Config:
        from_attributes = True


# ── Contest read ────────────────────────────────────────────────

class ContestRead(BaseModel):
    id: int
    election_id: int
    contest_type: str
    title: str
    seat_count: int
    constituency_id: int | None = None
    area_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Structure generation response ──────────────────────────────

class StructureGenerationResult(BaseModel):
    fptp_contests_created: int = 0
    pr_contests_created: int = 0
    mayor_contests_created: int = 0
    deputy_mayor_contests_created: int = 0
    total_contests: int


# ── Readiness check response ──────────────────────────────────

class ReadinessCheck(BaseModel):
    ready: bool
    issues: list[str]
    fptp_contests: int = 0
    pr_contests: int = 0
    total_contests: int = 0
    contest_counts: dict[str, int] = {}
    total_constituencies: int = 0
