"""CompreFace face-comparison provider adapter.

All provider logic is isolated here.  No election / ballot logic.
Fail-closed: any missing configuration or CompreFace unavailability raises RuntimeError.
"""

import base64
import logging
from pathlib import Path
from typing import NamedTuple

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

PROVIDER_NAME = "compreface"


# ── Result types ─────────────────────────────────────────────────


class ComparisonResult(NamedTuple):
    is_match: bool
    similarity: float


# ── Internal helpers ─────────────────────────────────────────────


def _require_configured() -> None:
    """Fail closed if CompreFace configuration is missing."""
    if not settings.COMPREFACE_URL:
        raise RuntimeError("COMPREFACE_URL is not configured")
    if not settings.COMPREFACE_VERIFICATION_API_KEY:
        raise RuntimeError(
            "COMPREFACE_VERIFICATION_API_KEY is not configured. "
            "Create a Verification service in CompreFace admin "
            f"({settings.COMPREFACE_URL}) and set the API key in .env."
        )


def _verification_url() -> str:
    """Build the CompreFace verification endpoint URL."""
    base = settings.COMPREFACE_URL.rstrip("/")
    return f"{base}/api/v1/verification/verify"


# ── Public API ───────────────────────────────────────────────────


def validate_enrollment_face(image_path: str) -> bool:
    """Check that the stored enrollment face file exists and is non-empty.

    This is a fast local pre-check before starting a session so we don't
    waste a challenge cycle when the stored image is missing.
    """
    base_dir = Path(__file__).resolve().parents[2]
    full_path = base_dir / image_path
    if not full_path.exists():
        return False
    if full_path.stat().st_size == 0:
        return False
    return True


def compare_faces(
    source_image_path: str,
    target_image_base64: str,
) -> ComparisonResult:
    """Compare a stored enrollment face against a live captured frame.

    source_image_path:    relative path to the stored enrollment face on disk.
    target_image_base64:  base64-encoded JPEG/PNG from the browser camera capture.

    Uses the CompreFace *verification* endpoint (POST with two images).
    """
    _require_configured()

    # ── Load stored enrollment image from disk ───────────────────
    base_dir = Path(__file__).resolve().parents[2]
    source_full_path = base_dir / source_image_path

    if not source_full_path.exists():
        raise RuntimeError("Stored enrollment face image not found on disk")

    # ── Decode the live frame ────────────────────────────────────
    try:
        target_bytes = base64.b64decode(target_image_base64)
    except Exception:
        raise RuntimeError("Invalid base64 data for captured frame")

    if len(target_bytes) < 1024:
        raise RuntimeError("Captured frame is too small to be a valid image")

    # ── Call CompreFace verification ─────────────────────────────
    url = _verification_url()
    headers = {"x-api-key": settings.COMPREFACE_VERIFICATION_API_KEY}

    try:
        with open(source_full_path, "rb") as src_file:
            files = {
                "source_image": ("enrollment.jpg", src_file, "image/jpeg"),
                "target_image": ("live.jpg", target_bytes, "image/jpeg"),
            }
            response = requests.post(
                url,
                headers=headers,
                files=files,
                timeout=15,
            )
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            f"Cannot connect to CompreFace at {url}. "
            "Ensure the CompreFace containers are running "
            "(docker compose -f infra/docker-compose.yml up -d)."
        )
    except requests.exceptions.Timeout:
        raise RuntimeError("CompreFace request timed out")
    except requests.exceptions.RequestException as exc:
        logger.error("CompreFace request failed: %s", exc)
        raise RuntimeError("Face comparison request failed") from exc

    if response.status_code != 200:
        detail = ""
        try:
            detail = response.json().get("message", response.text[:200])
        except Exception:
            detail = response.text[:200]
        logger.error(
            "CompreFace returned %d: %s", response.status_code, detail
        )
        raise RuntimeError(f"CompreFace error ({response.status_code}): {detail}")

    # ── Parse result ─────────────────────────────────────────────
    data = response.json()
    result_list = data.get("result", [])
    if not result_list:
        return ComparisonResult(is_match=False, similarity=0.0)

    best = max(result_list, key=lambda r: r.get("face_matches", [{}])[0].get("similarity", 0) if r.get("face_matches") else 0)
    face_matches = best.get("face_matches", [])
    if not face_matches:
        return ComparisonResult(is_match=False, similarity=0.0)

    similarity = face_matches[0].get("similarity", 0.0)
    # CompreFace returns similarity as 0.0–1.0; convert to percentage
    similarity_pct = round(similarity * 100, 2)

    threshold = settings.FACE_SIMILARITY_THRESHOLD
    return ComparisonResult(
        is_match=similarity_pct >= threshold,
        similarity=similarity_pct,
    )
