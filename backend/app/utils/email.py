import re

_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized:
        raise ValueError("Email is required")
    if len(normalized) > 255:
        raise ValueError("Email must be 255 characters or fewer")
    if not _EMAIL_PATTERN.fullmatch(normalized):
        raise ValueError("Invalid email address")
    return normalized


def is_valid_email(value: str) -> bool:
    return bool(_EMAIL_PATTERN.fullmatch(value.strip().lower()))
