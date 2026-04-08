"""Pydantic schemas for party management endpoints."""

from datetime import date, datetime

from pydantic import BaseModel, Field


class PartyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    name_ne: str | None = None
    abbreviation: str = Field(..., min_length=1, max_length=30)
    symbol_description: str | None = None
    registration_number: str | None = None
    address: str | None = None
    established_date: date | None = None


class PartyUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=200)
    name_ne: str | None = None
    abbreviation: str | None = Field(None, min_length=1, max_length=30)
    symbol_description: str | None = None
    registration_number: str | None = None
    address: str | None = None
    established_date: date | None = None
    is_active: bool | None = None


class PartyRead(BaseModel):
    id: int
    name: str
    name_ne: str | None = None
    abbreviation: str
    symbol_description: str | None = None
    registration_number: str | None = None
    address: str | None = None
    established_date: date | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
