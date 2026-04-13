"""AWS Rekognition Face Liveness + face comparison provider adapter.

All AWS provider logic is isolated here. No election/ballot logic.
Fail-closed: any missing configuration raises RuntimeError.
"""

import json
import logging
from pathlib import Path
from typing import NamedTuple

import boto3
from botocore.exceptions import ClientError, BotoCoreError

from app.core.config import settings

logger = logging.getLogger(__name__)

PROVIDER_NAME = "aws_rekognition"


# ── Result types ─────────────────────────────────────────────────


class LivenessResult(NamedTuple):
    is_live: bool
    confidence: float
    reference_image_bytes: bytes | None


class ComparisonResult(NamedTuple):
    is_match: bool
    confidence: float


class TemporaryCredentials(NamedTuple):
    access_key_id: str
    secret_access_key: str
    session_token: str


# ── Internal helpers ─────────────────────────────────────────────


def _require_configured() -> None:
    """Fail closed if provider configuration is missing or invalid."""
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise RuntimeError(
            "AWS Rekognition credentials are not configured. "
            "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
        )
    if not settings.AWS_REGION:
        raise RuntimeError("AWS_REGION is not configured")


def _get_rekognition_client():
    _require_configured()
    return boto3.client(
        "rekognition",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _get_sts_client():
    _require_configured()
    return boto3.client(
        "sts",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


# ── Public API ───────────────────────────────────────────────────


def create_liveness_session() -> str:
    """Create an AWS Rekognition Face Liveness session.

    Returns the session ID for use with the FaceLivenessDetector on the client.
    """
    client = _get_rekognition_client()
    try:
        response = client.create_face_liveness_session()
        session_id = response["SessionId"]
        logger.info("Created liveness session: %s", session_id)
        return session_id
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to create liveness session: %s", exc)
        raise RuntimeError("Failed to create face liveness session") from exc


def get_liveness_session_results(session_id: str) -> LivenessResult:
    """Fetch the results of a completed liveness session.

    Returns a LivenessResult with is_live, confidence, and reference image bytes.
    """
    client = _get_rekognition_client()
    try:
        response = client.get_face_liveness_session_results(SessionId=session_id)
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to get liveness results for %s: %s", session_id, exc)
        raise RuntimeError("Failed to retrieve liveness results") from exc

    confidence = response.get("Confidence", 0.0)
    status = response.get("Status", "FAILED")

    is_live = (
        status == "SUCCEEDED"
        and confidence >= settings.FACE_LIVENESS_CONFIDENCE_THRESHOLD
    )

    # Extract the reference image (best face frame from the challenge)
    ref_image = response.get("ReferenceImage", {})
    ref_bytes = ref_image.get("Bytes")

    return LivenessResult(
        is_live=is_live,
        confidence=round(confidence, 2),
        reference_image_bytes=ref_bytes,
    )


def compare_faces(
    source_image_bytes: bytes,
    target_image_path: str,
) -> ComparisonResult:
    """Compare a live face image against a stored enrollment face.

    source_image_bytes: live face image bytes from the liveness session.
    target_image_path: relative path to the stored enrollment face on disk.
    """
    base_dir = Path(__file__).resolve().parents[2]
    target_full_path = base_dir / target_image_path

    if not target_full_path.exists():
        raise RuntimeError("Stored enrollment face image not found on disk")

    target_bytes = target_full_path.read_bytes()

    client = _get_rekognition_client()
    try:
        response = client.compare_faces(
            SourceImage={"Bytes": source_image_bytes},
            TargetImage={"Bytes": target_bytes},
            SimilarityThreshold=settings.FACE_MATCH_CONFIDENCE_THRESHOLD,
        )
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to compare faces: %s", exc)
        raise RuntimeError("Face comparison failed") from exc

    face_matches = response.get("FaceMatches", [])
    if face_matches:
        best = max(face_matches, key=lambda m: m.get("Similarity", 0))
        similarity = best.get("Similarity", 0.0)
        return ComparisonResult(
            is_match=similarity >= settings.FACE_MATCH_CONFIDENCE_THRESHOLD,
            confidence=round(similarity, 2),
        )

    return ComparisonResult(is_match=False, confidence=0.0)


def get_temporary_credentials(session_duration_seconds: int = 900) -> TemporaryCredentials:
    """Get short-lived AWS credentials for the FaceLivenessDetector streaming client.

    Uses STS AssumeRole with an inline policy scoped to Rekognition liveness only.
    """
    if not settings.AWS_FACE_LIVENESS_ROLE_ARN:
        raise RuntimeError(
            "AWS_FACE_LIVENESS_ROLE_ARN is not configured. "
            "A dedicated IAM role is required for temporary frontend credentials."
        )

    sts = _get_sts_client()
    try:
        response = sts.assume_role(
            RoleArn=settings.AWS_FACE_LIVENESS_ROLE_ARN,
            RoleSessionName="vote-face-liveness",
            DurationSeconds=session_duration_seconds,
            Policy=json.dumps({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": ["rekognition:StartFaceLivenessSession"],
                        "Resource": "*",
                    }
                ],
            }),
        )
        creds = response["Credentials"]
        return TemporaryCredentials(
            access_key_id=creds["AccessKeyId"],
            secret_access_key=creds["SecretAccessKey"],
            session_token=creds["SessionToken"],
        )
    except (ClientError, BotoCoreError) as exc:
        logger.error("Failed to get temporary credentials: %s", exc)
        raise RuntimeError("Failed to obtain temporary credentials for face verification") from exc
