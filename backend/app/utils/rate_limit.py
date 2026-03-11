import time
from collections import defaultdict
from fastapi import HTTPException

_hits: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT_DETAIL = "Too many requests. Please try again later."

RATE_LIMIT_POLICIES = {
    "login": {"limit": 10, "window_seconds": 300},
    "auth_request_ip": {"limit": 5, "window_seconds": 900},
    "auth_request_identifier": {"limit": 3, "window_seconds": 900},
    "auth_code_verify_ip": {"limit": 10, "window_seconds": 900},
    "auth_code_verify_identifier": {"limit": 5, "window_seconds": 900},
    "email_verification_send_user": {"limit": 5, "window_seconds": 3600},
    "email_verification_send_ip": {"limit": 10, "window_seconds": 3600},
    "email_verification_check_user": {"limit": 10, "window_seconds": 900},
    "email_verification_check_ip": {"limit": 20, "window_seconds": 900},
    "totp_verify_user": {"limit": 10, "window_seconds": 300},
    "totp_verify_ip": {"limit": 20, "window_seconds": 300},
}


def check_rate_limit(
    key: str,
    limit: int,
    window_seconds: int,
    detail: str = RATE_LIMIT_DETAIL,
) -> None:
    """Raise 429 if *key* has been called more than *limit* times in *window_seconds*."""
    now = time.monotonic()
    bucket = _hits[key]

    # Prune expired timestamps
    cutoff = now - window_seconds
    _hits[key] = bucket = [t for t in bucket if t > cutoff]

    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail=detail)

    bucket.append(now)


def check_named_rate_limit(policy_name: str, key: str) -> None:
    """Apply a named rate-limit policy to a specific key."""
    policy = RATE_LIMIT_POLICIES[policy_name]
    check_rate_limit(
        key=key,
        limit=policy["limit"],
        window_seconds=policy["window_seconds"],
    )
