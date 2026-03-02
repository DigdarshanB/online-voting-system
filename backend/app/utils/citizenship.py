import re

from fastapi import HTTPException

_FORMATTED_PATTERN = re.compile(r"^\d{2}-\d{2}-\d{2}-\d{5}$")
_DIGITS_ONLY_PATTERN = re.compile(r"^\d{10,16}$")


def normalize_citizenship_number(value: str) -> str:
    raw = (value or "").strip()

    if _FORMATTED_PATTERN.fullmatch(raw):
        return raw.replace("-", "")

    if _DIGITS_ONLY_PATTERN.fullmatch(raw):
        return raw

    raise HTTPException(status_code=400, detail="Invalid citizenship number format")
