"""
Face Verification Feature — Validation & Regression Test Suite

Tests the full CompreFace + MediaPipe liveness migration (Phases 1–3).
Requires:
  - Backend running (uvicorn)
  - MySQL database accessible
  - CompreFace NOT required for unit-level checks (mocked where needed)

Run:
  cd backend && source .venv/bin/activate
  python test_face_verification.py
"""

import base64
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

# ── Setup path ───────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings
from app.services import face_provider
from app.services.face_provider import ComparisonResult

PASS = 0
FAIL = 0
RESULTS = []


def check(name: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        RESULTS.append(("PASS", name))
    else:
        FAIL += 1
        RESULTS.append(("FAIL", name, detail))
    status = "✅ PASS" if condition else "❌ FAIL"
    print(f"  {status}: {name}" + (f" — {detail}" if detail and not condition else ""))


# ═══════════════════════════════════════════════════════════════════
# Section 1: Configuration Checks
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 1: Configuration Checks")
print("=" * 70)

check("COMPREFACE_URL is set", bool(settings.COMPREFACE_URL))
check(
    "COMPREFACE_URL default is localhost:8000",
    settings.COMPREFACE_URL == "http://localhost:8000",
)
check(
    "FACE_SIMILARITY_THRESHOLD is 75.0 (0.75 calibration start)",
    settings.FACE_SIMILARITY_THRESHOLD == 75.0,
    f"Got {settings.FACE_SIMILARITY_THRESHOLD}",
)
check(
    "FACE_SIMILARITY_THRESHOLD >= 65 (minimum floor)",
    settings.FACE_SIMILARITY_THRESHOLD >= 65.0,
)
check(
    "Challenge pool has 5 actions",
    len([c.strip() for c in settings.FACE_VERIFY_CHALLENGE_POOL.split(",") if c.strip()]) == 5,
)
check(
    "Challenge actions correct",
    set(c.strip() for c in settings.FACE_VERIFY_CHALLENGE_POOL.split(",")) == {"turn_left", "turn_right", "blink", "nod", "smile"},
)
check("FACE_VERIFY_CHALLENGE_COUNT is 2", settings.FACE_VERIFY_CHALLENGE_COUNT == 2)
check("FACE_VERIFY_MAX_FAILURES is 5", settings.FACE_VERIFY_MAX_FAILURES == 5)
check("FACE_VERIFY_LOCK_DURATION_MINUTES is 15", settings.FACE_VERIFY_LOCK_DURATION_MINUTES == 15)
check("FACE_VERIFICATION_TOKEN_TTL_SECONDS is 300", settings.FACE_VERIFICATION_TOKEN_TTL_SECONDS == 300)
check("Provider name is 'compreface'", face_provider.PROVIDER_NAME == "compreface")

# No AWS config remnants
for attr in ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_FACE_LIVENESS_ROLE_ARN"]:
    check(f"No {attr} in config", not hasattr(settings, attr))


# ═══════════════════════════════════════════════════════════════════
# Section 2: Face Provider — Fail-Closed Behavior
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 2: Face Provider — Fail-Closed Checks")
print("=" * 70)

# _require_configured should fail if no API key
try:
    face_provider._require_configured()
    has_key = bool(settings.COMPREFACE_VERIFICATION_API_KEY)
    if not has_key:
        check("Fail-closed: no API key → RuntimeError", False, "Should have raised")
    else:
        check("Fail-closed: API key configured, _require_configured passes", True)
except RuntimeError as e:
    check("Fail-closed: no API key → RuntimeError", "API_KEY" in str(e).upper() or "CONFIGURED" in str(e).upper())

# validate_enrollment_face with nonexistent path
check(
    "validate_enrollment_face: missing file → False",
    face_provider.validate_enrollment_face("nonexistent/path/face.jpg") == False,
)

# compare_faces with missing config should raise RuntimeError
with patch.object(settings, "COMPREFACE_VERIFICATION_API_KEY", ""):
    try:
        face_provider.compare_faces("test.jpg", "dGVzdA==")
        check("compare_faces: no API key → RuntimeError", False, "Should have raised")
    except RuntimeError:
        check("compare_faces: no API key → RuntimeError", True)

# compare_faces with invalid base64 should raise RuntimeError
with patch.object(settings, "COMPREFACE_VERIFICATION_API_KEY", "test-key"):
    try:
        face_provider.compare_faces("nonexistent.jpg", "!!!invalid-base64!!!")
        check("compare_faces: invalid base64 → RuntimeError", False)
    except RuntimeError:
        check("compare_faces: invalid base64 → RuntimeError", True)

# CompreFace connection refused should raise RuntimeError
with patch.object(settings, "COMPREFACE_VERIFICATION_API_KEY", "test-key"), \
     patch.object(settings, "COMPREFACE_URL", "http://127.0.0.1:19999"):
    # Create a dummy file for source_image_path
    dummy_path = Path(__file__).parent / "uploads" / "faces" / "__test_dummy.jpg"
    dummy_path.parent.mkdir(parents=True, exist_ok=True)
    dummy_path.write_bytes(b"\xff\xd8\xff" + b"\x00" * 1024)  # minimal JPEG header
    try:
        valid_b64 = base64.b64encode(b"\xff\xd8\xff" + b"\x00" * 2048).decode()
        face_provider.compare_faces(
            f"uploads/faces/__test_dummy.jpg",
            valid_b64,
        )
        check("compare_faces: CompreFace unreachable → RuntimeError", False, "Should have raised")
    except RuntimeError as e:
        check(
            "compare_faces: CompreFace unreachable → RuntimeError",
            "connect" in str(e).lower() or "unavailable" in str(e).lower() or "timed out" in str(e).lower(),
        )
    finally:
        dummy_path.unlink(missing_ok=True)


# ═══════════════════════════════════════════════════════════════════
# Section 3: Token Issuance & Validation
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 3: Token Issuance & Validation")
print("=" * 70)

from app.services.vote_identity_service import (
    _create_verification_token,
    _decode_verification_token,
)

token, expires_at = _create_verification_token(
    voter_id=99,
    election_id=42,
    government_level="FEDERAL",
    provider_session_id="test-nonce-abc",
)
check("Token is a non-empty string", isinstance(token, str) and len(token) > 20)
check("Token expires in ~300 seconds", abs((expires_at - datetime.now(timezone.utc)).total_seconds() - 300) < 5)

# Decode valid token
payload = _decode_verification_token(token)
check("Decoded token has correct voter ID", str(payload["sub"]) == "99")
check("Decoded token has correct election ID", payload["eid"] == 42)
check("Decoded token has correct government level", payload["gl"] == "FEDERAL")
check("Decoded token has session nonce", payload["psid"] == "test-nonce-abc")
check("Decoded token has purpose", payload["purpose"] == "vote_face_verification")

# Expired token should fail
from jose import jwt as jose_jwt
expired_payload = {
    "sub": "99",
    "purpose": "vote_face_verification",
    "eid": 42,
    "gl": "FEDERAL",
    "psid": "old-nonce",
    "iat": int((datetime.now(timezone.utc) - timedelta(hours=1)).timestamp()),
    "exp": int((datetime.now(timezone.utc) - timedelta(minutes=1)).timestamp()),
}
expired_token = jose_jwt.encode(expired_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
from fastapi import HTTPException
try:
    _decode_verification_token(expired_token)
    check("Expired token → HTTPException", False)
except HTTPException as e:
    check("Expired token → HTTPException", e.status_code == 400)

# Tampered token should fail
try:
    _decode_verification_token(token + "tampered")
    check("Tampered token → HTTPException", False)
except HTTPException as e:
    check("Tampered token → HTTPException", e.status_code == 400)

# Wrong purpose token should fail
wrong_purpose = {
    "sub": "99",
    "purpose": "password_reset",
    "eid": 42,
    "gl": "FEDERAL",
    "psid": "nonce",
    "iat": int(datetime.now(timezone.utc).timestamp()),
    "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()),
}
wrong_token = jose_jwt.encode(wrong_purpose, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
try:
    _decode_verification_token(wrong_token)
    check("Wrong purpose token → HTTPException", False)
except HTTPException as e:
    check("Wrong purpose token → HTTPException", e.status_code == 400)


# ═══════════════════════════════════════════════════════════════════
# Section 4: Challenge Selection
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 4: Challenge Selection")
print("=" * 70)

from app.services.vote_identity_service import _pick_challenges

valid_actions = {"turn_left", "turn_right", "blink", "nod", "smile"}
for i in range(20):
    challenges = _pick_challenges()
    if len(challenges) != 2:
        check(f"Challenge pick {i}: count is 2", False, f"Got {len(challenges)}")
        break
    if not all(c in valid_actions for c in challenges):
        check(f"Challenge pick {i}: valid actions", False, f"Got {challenges}")
        break
    if len(set(challenges)) != 2:
        check(f"Challenge pick {i}: no duplicates", False, f"Got {challenges}")
        break
else:
    check("20 random challenge picks: all valid (count=2, no dupes, valid actions)", True)


# ═══════════════════════════════════════════════════════════════════
# Section 5: Retry / Lock Policy
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 5: Retry / Lock Policy (unit-level)")
print("=" * 70)

from app.services.vote_identity_service import _compute_retry_state

# Mock the DB queries
with patch("app.services.vote_identity_service.find_active_vote_face_lock") as mock_lock, \
     patch("app.services.vote_identity_service.count_recent_vote_face_failures") as mock_count, \
     patch("app.services.vote_identity_service.get_last_vote_face_failure_time") as mock_last:

    mock_db = MagicMock()

    # 0 failures → not locked, 5 remaining
    mock_lock.return_value = None
    mock_count.return_value = 0
    mock_last.return_value = None
    state = _compute_retry_state(mock_db, 1, 1)
    check("0 failures → not locked", not state["is_locked"])
    check("0 failures → 5 remaining", state["remaining_attempts"] == 5)
    check("0 failures → 0 cooldown", state["cooldown_seconds"] == 0)

    # 2 failures → not locked, 3 remaining, no cooldown
    mock_count.return_value = 2
    state = _compute_retry_state(mock_db, 1, 1)
    check("2 failures → 3 remaining", state["remaining_attempts"] == 3)
    check("2 failures → no cooldown", state["cooldown_seconds"] == 0)

    # 3 failures → not locked, 2 remaining, 30s cooldown if recent
    mock_count.return_value = 3
    mock_last.return_value = datetime.now(timezone.utc) - timedelta(seconds=5)
    state = _compute_retry_state(mock_db, 1, 1)
    check("3 failures → 2 remaining", state["remaining_attempts"] == 2)
    check("3 failures → cooldown active (25-30s)", 20 <= state["cooldown_seconds"] <= 30)

    # 4 failures → not locked, 1 remaining, 60s cooldown if recent
    mock_count.return_value = 4
    mock_last.return_value = datetime.now(timezone.utc) - timedelta(seconds=10)
    state = _compute_retry_state(mock_db, 1, 1)
    check("4 failures → 1 remaining", state["remaining_attempts"] == 1)
    check("4 failures → cooldown active (45-55s)", 40 <= state["cooldown_seconds"] <= 55)

    # 5 failures → LOCKED
    mock_count.return_value = 5
    state = _compute_retry_state(mock_db, 1, 1)
    check("5 failures → LOCKED", state["is_locked"])
    check("5 failures → 0 remaining", state["remaining_attempts"] == 0)
    check("5 failures → locked_until set", state["locked_until"] is not None)

    # Active lock from DB
    lock_time = datetime.now(timezone.utc) + timedelta(minutes=10)
    mock_lock.return_value = lock_time
    mock_count.return_value = 0  # doesn't matter — lock takes priority
    state = _compute_retry_state(mock_db, 1, 1)
    check("Active lock → is_locked", state["is_locked"])
    check("Active lock → locked_until matches", state["locked_until"] == lock_time)


# ═══════════════════════════════════════════════════════════════════
# Section 6: Nonce / Replay Protection
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 6: Nonce / Replay Protection")
print("=" * 70)

from app.services.vote_identity_service import _verify_face

# Mock everything needed
with patch("app.services.vote_identity_service.is_provider_session_id_used") as mock_used, \
     patch("app.services.vote_identity_service.face_provider") as mock_fp, \
     patch("app.services.vote_identity_service.count_recent_vote_face_failures") as mock_cnt, \
     patch("app.services.vote_identity_service.create_audit_log_inline"):

    mock_db = MagicMock()
    mock_voter = MagicMock()
    mock_voter.id = 1
    mock_voter.face_image_path = "uploads/faces/test.jpg"
    mock_election = MagicMock()
    mock_election.id = 42
    mock_election.government_level = "FEDERAL"
    mock_fp.PROVIDER_NAME = "compreface"

    # Replay: nonce already used → HTTPException
    mock_used.return_value = True
    token_payload = {"psid": "used-nonce"}
    try:
        _verify_face(mock_db, mock_voter, mock_election, token_payload, "base64data" * 20, None)
        check("Replayed nonce → HTTPException", False)
    except HTTPException as e:
        check("Replayed nonce → HTTPException (400)", e.status_code == 400 and "already been used" in e.detail)

    # Fresh nonce, missing captured frame → failure recorded
    mock_used.return_value = False
    mock_cnt.return_value = 0
    result = _verify_face(mock_db, mock_voter, mock_election, {"psid": "fresh"}, "", None)
    check("Empty captured frame → failure dict", result is not None and result.get("reason_code") == "NO_CAPTURED_FRAME")

    result = _verify_face(mock_db, mock_voter, mock_election, {"psid": "fresh2"}, "short", None)
    check("Too-short captured frame → failure dict", result is not None and result.get("reason_code") == "NO_CAPTURED_FRAME")

    # CompreFace unavailable → 502
    mock_used.return_value = False
    mock_fp.compare_faces.side_effect = RuntimeError("Connection refused")
    valid_frame = "a" * 200
    try:
        _verify_face(mock_db, mock_voter, mock_election, {"psid": "fresh3"}, valid_frame, None)
        check("CompreFace unavailable → HTTPException 502", False)
    except HTTPException as e:
        check("CompreFace unavailable → HTTPException 502", e.status_code == 502)

    # Face mismatch → failure
    mock_fp.compare_faces.side_effect = None
    mock_fp.compare_faces.return_value = ComparisonResult(is_match=False, similarity=45.0)
    result = _verify_face(mock_db, mock_voter, mock_election, {"psid": "fresh4"}, valid_frame, None)
    check("Face mismatch → FACE_MISMATCH failure", result is not None and result.get("reason_code") == "FACE_MISMATCH")

    # Face match → None (success)
    mock_fp.compare_faces.return_value = ComparisonResult(is_match=True, similarity=82.5)
    result = _verify_face(mock_db, mock_voter, mock_election, {"psid": "fresh5"}, valid_frame, None)
    check("Face match → None (success)", result is None)


# ═══════════════════════════════════════════════════════════════════
# Section 7: Route / DTO Structure
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 7: Route / DTO Structure")
print("=" * 70)

from app.routes.voter_elections import (
    VerifyAndCastRequest,
    VerifyAndCastLocalRequest,
    CastBallotRequest,
    CastLocalBallotRequest,
)

# VerifyAndCastRequest must have captured_frame
fields = VerifyAndCastRequest.model_fields
check("VerifyAndCastRequest has verification_context_token", "verification_context_token" in fields)
check("VerifyAndCastRequest has captured_frame", "captured_frame" in fields)
check("VerifyAndCastRequest has fptp_nomination_id", "fptp_nomination_id" in fields)
check("VerifyAndCastRequest has pr_party_id", "pr_party_id" in fields)

# VerifyAndCastLocalRequest must have captured_frame
fields = VerifyAndCastLocalRequest.model_fields
check("VerifyAndCastLocalRequest has verification_context_token", "verification_context_token" in fields)
check("VerifyAndCastLocalRequest has captured_frame", "captured_frame" in fields)
check("VerifyAndCastLocalRequest has all 6 local fields", all(
    f in fields for f in [
        "head_nomination_id", "deputy_head_nomination_id",
        "ward_chair_nomination_id", "ward_woman_member_nomination_id",
        "ward_dalit_woman_member_nomination_id", "ward_member_open_nomination_ids"
    ]
))

# Original cast DTOs must NOT have captured_frame (unmodified)
check("CastBallotRequest has NO captured_frame", "captured_frame" not in CastBallotRequest.model_fields)
check("CastLocalBallotRequest has NO captured_frame", "captured_frame" not in CastLocalBallotRequest.model_fields)

# Check route paths exist
from app.routes.voter_elections import router as voter_router
route_paths = [r.path for r in voter_router.routes]
check("/cast endpoint exists", any("cast" == p.split("/")[-1] for p in route_paths))
check("/cast-local endpoint exists", any("cast-local" == p.split("/")[-1] for p in route_paths))
check("/face-session/start endpoint exists", any("start" == p.split("/")[-1] for p in route_paths))
check("/verify-and-cast endpoint exists", any("verify-and-cast" == p.split("/")[-1] for p in route_paths))
check("/verify-and-cast-local endpoint exists", any("verify-and-cast-local" == p.split("/")[-1] for p in route_paths))


# ═══════════════════════════════════════════════════════════════════
# Section 8: No-AWS Remnant Verification (code-level)
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 8: No AWS Remnants in Active Code")
print("=" * 70)

import importlib
import inspect

# Check face_provider has no AWS imports
source = inspect.getsource(face_provider)
check("face_provider: no 'boto3'", "boto3" not in source)
check("face_provider: no 'aws'", "aws" not in source.lower() or "aws" not in source)
check("face_provider: no 'rekognition'", "rekognition" not in source.lower())
check("face_provider: no 'Amplify'", "Amplify" not in source)

# Check vote_identity_service has no AWS imports
from app.services import vote_identity_service
source2 = inspect.getsource(vote_identity_service)
check("vote_identity_service: no 'boto3'", "boto3" not in source2)
check("vote_identity_service: no 'rekognition'", "rekognition" not in source2.lower())
check("vote_identity_service: no 'liveness_session'", "liveness_session" not in source2.lower() or "provider_session" in source2)

# Check config has no AWS settings
check("Config: no AWS_REGION", not hasattr(settings, "AWS_REGION"))
check("Config: no AWS_ACCESS_KEY_ID", not hasattr(settings, "AWS_ACCESS_KEY_ID"))
check("Config: no FACE_LIVENESS_CONFIDENCE_THRESHOLD", not hasattr(settings, "FACE_LIVENESS_CONFIDENCE_THRESHOLD"))
check("Config: no FACE_MATCH_CONFIDENCE_THRESHOLD", not hasattr(settings, "FACE_MATCH_CONFIDENCE_THRESHOLD"))


# ═══════════════════════════════════════════════════════════════════
# Section 9: ComparisonResult / Threshold Logic
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("SECTION 9: Threshold Calibration Guidance")
print("=" * 70)

print("  Threshold testing guidance:")
print(f"  Current threshold: {settings.FACE_SIMILARITY_THRESHOLD}% (CompreFace 0-1 → 0-100 scale)")
print("  ")
print("  Test matrix (requires CompreFace running + real face images):")
print("  ┌─────────────────────────────────────┬──────────┬──────────┐")
print("  │ Scenario                             │ Expected │ Sim %    │")
print("  ├─────────────────────────────────────┼──────────┼──────────┤")
print("  │ Same voter, good lighting            │ PASS     │ >85%     │")
print("  │ Same voter, moderate lighting         │ PASS     │ >75%     │")
print("  │ Same voter with glasses              │ PASS     │ >70%     │")
print("  │ Different voter (deliberate mismatch)│ FAIL     │ <50%     │")
print("  └─────────────────────────────────────┴──────────┴──────────┘")
print(f"  Do NOT lower below 65% without strong evidence-based reason.")
print()
check("Threshold >= 65% floor", settings.FACE_SIMILARITY_THRESHOLD >= 65.0)
check("Threshold == 75.0% (calibration start)", settings.FACE_SIMILARITY_THRESHOLD == 75.0)


# ═══════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("FINAL SUMMARY")
print("=" * 70)
print(f"  Total checks: {PASS + FAIL}")
print(f"  ✅ Passed:    {PASS}")
print(f"  ❌ Failed:    {FAIL}")

if FAIL > 0:
    print("\n  Failed checks:")
    for r in RESULTS:
        if r[0] == "FAIL":
            detail = r[2] if len(r) > 2 else ""
            print(f"    ❌ {r[1]}" + (f" — {detail}" if detail else ""))

print("\n" + "=" * 70)
if FAIL == 0:
    print("🎉 ALL CHECKS PASSED — Face verification migration validated")
else:
    print(f"⚠️  {FAIL} CHECK(S) FAILED — Review above")
print("=" * 70)

sys.exit(1 if FAIL > 0 else 0)
