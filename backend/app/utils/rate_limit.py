import time
from collections import defaultdict
from fastapi import HTTPException

_hits: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(key: str, limit: int, window_seconds: int) -> None:
    """Raise 429 if *key* has been called more than *limit* times in *window_seconds*."""
    now = time.monotonic()
    bucket = _hits[key]

    # Prune expired timestamps
    cutoff = now - window_seconds
    _hits[key] = bucket = [t for t in bucket if t > cutoff]

    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")

    bucket.append(now)
