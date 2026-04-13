"""Face-comparison provider adapter — internal service boundary.

Uses DeepFace for local face similarity verification between a stored
enrollment image and a live captured frame.

All provider logic is isolated here. No election / ballot logic.
Fail-closed: any provider failure prevents vote casting.

The compare_faces() function is the single integration point used by
vote_identity_service for pre-cast face identity verification.
"""

import base64
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import NamedTuple

import cv2
import numpy as np
from deepface import DeepFace

from app.core.config import settings

logger = logging.getLogger(__name__)

PROVIDER_NAME = "deepface"


class FaceNotDetectedError(RuntimeError):
    """No face detected in the submitted image."""


class MultipleFacesError(RuntimeError):
    """Multiple faces detected in the submitted image."""


class EnrollmentFaceInvalidError(RuntimeError):
    """Stored enrollment face image is missing, unreadable, or unusable."""


class CapturedFrameInvalidError(RuntimeError):
    """Submitted captured frame is missing, unreadable, or unusable."""


class ComparisonResult(NamedTuple):
    is_match: bool
    similarity: float  # 0–100 display score (higher = more similar)


def _resolve_image_path(path_value: str) -> Path:
    """Resolve an image path robustly.

    Supports:
    - absolute paths
    - paths relative to backend root
    - paths that may already include a leading 'backend/' segment
    """
    raw = Path(path_value).expanduser()

    if raw.is_absolute():
        return raw.resolve()

    backend_dir = Path(__file__).resolve().parents[2]      # .../backend
    project_root = backend_dir.parent                      # repo root

    candidates = [
        (backend_dir / raw).resolve(),
        (project_root / raw).resolve(),
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    return (backend_dir / raw).resolve()


def _decode_base64_image(b64_data: str) -> np.ndarray:
    """Decode a base64 string (with optional data-URI prefix) into a BGR numpy array."""
    cleaned = re.sub(r"^data:image/[a-zA-Z0-9.+-]+;base64,", "", b64_data)

    try:
        raw_bytes = base64.b64decode(cleaned)
    except Exception as exc:
        raise CapturedFrameInvalidError("Invalid base64 data for captured frame") from exc

    if len(raw_bytes) < 1024:
        raise CapturedFrameInvalidError("Captured frame is too small to be a valid image")

    img_array = np.frombuffer(raw_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None or img.size == 0:
        raise CapturedFrameInvalidError("Captured frame could not be decoded as an image")

    return img


def _count_faces_quick(img: np.ndarray) -> int:
    """Quick face count using OpenCV Haar cascade as a lightweight pre-check."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    return len(faces)


def _write_temp_image(img: np.ndarray) -> Path:
    """Write an OpenCV image to a temporary JPEG file and return its path."""
    fd, temp_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)

    temp_file = Path(temp_path)
    ok = cv2.imwrite(str(temp_file), img)
    if not ok or not temp_file.exists() or temp_file.stat().st_size == 0:
        raise CapturedFrameInvalidError("Failed to materialize captured frame for verification")

    return temp_file


def validate_enrollment_face(image_path: str) -> bool:
    """Check that the stored enrollment face file exists, is non-empty, and is readable."""
    try:
        full_path = _resolve_image_path(image_path)
        if not full_path.exists():
            return False
        if full_path.stat().st_size == 0:
            return False

        img = cv2.imread(str(full_path))
        if img is None or img.size == 0:
            return False

        return True
    except Exception:
        return False


def compare_faces(
    source_image_path: str,
    target_image_base64: str,
) -> ComparisonResult:
    """Compare a stored enrollment face against a live captured frame using DeepFace."""
    source_full_path = _resolve_image_path(source_image_path)

    if not source_full_path.exists():
        raise EnrollmentFaceInvalidError("Stored enrollment face image not found on disk")

    source_img = cv2.imread(str(source_full_path))
    if source_img is None or source_img.size == 0:
        raise EnrollmentFaceInvalidError("Stored enrollment face image could not be read")

    target_img = _decode_base64_image(target_image_base64)

    face_count = _count_faces_quick(target_img)
    if face_count > 1:
        raise MultipleFacesError(
            f"Multiple faces ({face_count}) detected in the captured frame. "
            "Only one face should be visible."
        )

    model = settings.DEEPFACE_MODEL_NAME
    detector = settings.DEEPFACE_DETECTOR_BACKEND
    metric = settings.DEEPFACE_DISTANCE_METRIC

    target_temp_path = _write_temp_image(target_img)

    try:
        result = DeepFace.verify(
            img1_path=str(source_full_path),
            img2_path=str(target_temp_path),
            model_name=model,
            detector_backend=detector,
            distance_metric=metric,
            enforce_detection=True,
        )
    except ValueError as exc:
        msg = str(exc).lower()

        if "img1_path" in msg:
            raise EnrollmentFaceInvalidError(
                f"Stored enrollment face image could not be processed by DeepFace: {exc}"
            ) from exc

        if "img2_path" in msg:
            if "face" in msg and ("detect" in msg or "found" in msg or "confirm" in msg):
                raise FaceNotDetectedError(
                    "No face detected in the captured frame. "
                    "Please ensure your face is clearly visible and well-lit."
                ) from exc
            raise CapturedFrameInvalidError(
                f"Captured frame could not be processed by DeepFace: {exc}"
            ) from exc

        if "face" in msg and ("detect" in msg or "found" in msg or "confirm" in msg):
            raise FaceNotDetectedError(
                "No face detected in the captured frame. "
                "Please ensure your face is clearly visible and well-lit."
            ) from exc

        raise RuntimeError(f"Face verification engine error: {exc}") from exc
    finally:
        try:
            target_temp_path.unlink(missing_ok=True)
        except Exception:
            logger.warning("Could not delete temporary verification image: %s", target_temp_path)

    is_match = result.get("verified", False)
    distance = float(result.get("distance", 1.0))
    threshold = float(result.get("threshold", 0.0))

    if metric == "cosine":
        similarity_pct = round(max(0.0, (1.0 - distance)) * 100, 2)
    else:
        if threshold > 0:
            similarity_pct = round(max(0.0, (1.0 - distance / (threshold * 2))) * 100, 2)
        else:
            similarity_pct = 0.0

    logger.info(
        "DeepFace verification: model=%s metric=%s distance=%.4f threshold=%.4f "
        "verified=%s similarity_display=%.1f%% source=%s",
        model,
        metric,
        distance,
        threshold,
        is_match,
        similarity_pct,
        source_full_path,
    )

    return ComparisonResult(is_match=is_match, similarity=similarity_pct)