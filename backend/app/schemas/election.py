"""Pydantic schemas for election management endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Election CRUD ───────────────────────────────────────────────

class ElectionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str | None = None
    government_level: str = Field(..., pattern="^(FEDERAL|PROVINCIAL|LOCAL)$")
    election_subtype: str = Field(..., pattern="^(HOR_DIRECT|PROVINCIAL_ASSEMBLY|LOCAL_MUNICIPAL|LOCAL_RURAL|NATIONAL_ASSEMBLY_INDIRECT|DISTRICT_COORDINATION_INDIRECT)$")
    start_time: datetime
    end_time: datetime


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
    start_time: datetime
    end_time: datetime
    contest_count: int = 0
    fptp_count: int = 0
    pr_count: int = 0
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
    total_constituencies: int = 0
