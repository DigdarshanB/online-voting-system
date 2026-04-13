"""Vote identity verification orchestration service.

Responsibilities:
- Validate voter / election state for face-session start
- Enforce retry / cooldown / lock policy from audit history
- Issue and validate signed verification context tokens
- Check replay via provider session ID audit trail
- Call provider adapter for liveness + face comparison
- Decide pass / fail / lock outcome
- Write audit rows inside the caller's DB session (transactional)
- Dispatch to existing ballot-casting functions only after verification passes
"""

import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.auth_audit_log import AuthAuditLog
from app.models.election import Election
from app.models.user import User
from app.repositories import ballot_repository
from app.repositories.auth_audit_repository import (
    count_recent_vote_face_failures,
    create_audit_log_inline,
    find_active_vote_face_lock,
    get_last_vote_face_failure_time,
    is_provider_session_id_used,
)
from app.services import face_provider
from app.services.ballot_service import (
    cast_dual_ballot_dispatch,
    cast_local_ballot_dispatch,
)

logger = logging.getLogger(__name__)


# ── Request context helpers ──────────────────────────────────────


def _client_ip(request: Request | None) -> str | None:
    return request.client.host if request and request.client else None


def _client_ua(request: Request | None) -> str | None:
    if not request:
        return None
    return (request.headers.get("user-agent") or "")[:500] or None


# ── Signed verification-context token ───────────────────────────


def _create_verification_token(
    voter_id: int,
    election_id: int,
    government_level: str,
    provider_session_id: str,
) -> tuple[str, datetime]:
    """Issue a short-lived JWT binding voter, election, and provider session."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(seconds=settings.FACE_VERIFICATION_TOKEN_TTL_SECONDS)
    payload = {
        "sub": str(voter_id),
        "purpose": "vote_face_verification",
        "eid": election_id,
        "gl": government_level,
        "psid": provider_session_id,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, exp


def _decode_verification_token(token: str) -> dict:
    """Decode and validate a verification context token.  Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    if payload.get("purpose") != "vote_face_verification":
        raise HTTPException(status_code=400, detail="Invalid verification token purpose")
    required = ("sub", "eid", "gl", "psid")
    if any(payload.get(k) is None for k in required):
        raise HTTPException(status_code=400, detail="Malformed verification token")
    return payload


# ── Retry / cooldown / lock policy ──────────────────────────────


def _compute_retry_state(db: Session, voter_id: int, election_id: int) -> dict:
    """Compute current retry state from audit-log history.

    Returns dict with: is_locked, locked_until, remaining_attempts,
    cooldown_seconds, failure_count.
    """
    max_failures = settings.FACE_VERIFY_MAX_FAILURES
    window_min = settings.FACE_VERIFY_OBSERVATION_WINDOW_MINUTES
    lock_min = settings.FACE_VERIFY_LOCK_DURATION_MINUTES

    # 1. Active lock?
    locked_until = find_active_vote_face_lock(db, voter_id, election_id)
    if locked_until:
        return {
            "is_locked": True,
            "locked_until": locked_until,
            "remaining_attempts": 0,
            "cooldown_seconds": 0,
            "failure_count": max_failures,
        }

    # 2. Count failures in window
    failure_count = count_recent_vote_face_failures(
        db, voter_id, election_id, window_min
    )
    remaining = max(0, max_failures - failure_count)

    # If failures already at max → should be locked (edge case)
    if failure_count >= max_failures:
        lock_until = datetime.now(timezone.utc) + timedelta(minutes=lock_min)
        return {
            "is_locked": True,
            "locked_until": lock_until,
            "remaining_attempts": 0,
            "cooldown_seconds": 0,
            "failure_count": failure_count,
        }

    # 3. Progressive cooldown based on current failure count
    #    failure 1-2: immediate retry
    #    failure 3:   30-second cooldown
    #    failure 4:   60-second cooldown
    cooldown_seconds = 0
    if failure_count >= 4:
        cooldown_seconds = 60
    elif failure_count >= 3:
        cooldown_seconds = 30

    # If a cooldown is required, check elapsed time since last failure
    if cooldown_seconds > 0:
        last_fail_at = get_last_vote_face_failure_time(
            db, voter_id, election_id, window_min
        )
        if last_fail_at:
            if last_fail_at.tzinfo is None:
                last_fail_at = last_fail_at.replace(tzinfo=timezone.utc)
            elapsed = (datetime.now(timezone.utc) - last_fail_at).total_seconds()
            if elapsed < cooldown_seconds:
                # Still in cooldown
                cooldown_seconds = int(cooldown_seconds - elapsed)
            else:
                cooldown_seconds = 0  # Cooldown has elapsed

    return {
        "is_locked": False,
        "locked_until": None,
        "remaining_attempts": remaining,
        "cooldown_seconds": cooldown_seconds,
        "failure_count": failure_count,
    }


# ── Audit helper (writes into caller's session) ─────────────────


def _audit(
    db: Session,
    *,
    action: str,
    voter_id: int,
    outcome: str = "SUCCESS",
    request: Request | None = None,
    metadata: dict | None = None,
) -> None:
    create_audit_log_inline(
        db,
        action=action,
        actor_user_id=voter_id,
        target_user_id=voter_id,
        outcome=outcome,
        ip_address=_client_ip(request),
        user_agent=_client_ua(request),
        metadata=metadata,
    )


# ── Shared validation ───────────────────────────────────────────


def _load_election(db: Session, election_id: int) -> Election:
    election = db.get(Election, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


def _validate_voter_election_state(
    db: Session, voter: User, election: Election
) -> None:
    """Common pre-checks shared by session-start and verify-and-cast."""
    if election.status != "POLLING_OPEN":
        raise HTTPException(
            status_code=400, detail="This election is not currently open for voting"
        )
    now = datetime.now(timezone.utc)
    if election.polling_start_at and now < election.polling_start_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Polling has not started yet")
    if election.polling_end_at and now > election.polling_end_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Polling has ended")

    existing = ballot_repository.get_ballot(db, election.id, voter.id)
    if existing:
        raise HTTPException(
            status_code=409, detail="You have already cast your ballot in this election"
        )

    if not voter.face_image_path:
        raise HTTPException(
            status_code=400,
            detail="No registration face image found. Complete face enrollment first.",
        )


# ── Public endpoints ─────────────────────────────────────────────


def _pick_challenges() -> list[str]:
    """Randomly select challenge actions from the configured pool."""
    pool = [c.strip() for c in settings.FACE_VERIFY_CHALLENGE_POOL.split(",") if c.strip()]
    count = min(settings.FACE_VERIFY_CHALLENGE_COUNT, len(pool))
    return random.sample(pool, count)


def start_face_session(
    db: Session,
    voter: User,
    election_id: int,
    request: Request | None = None,
) -> dict:
    """Start a face verification session for pre-cast identity check.

    Validates enrollment face, generates a nonce and challenge actions,
    issues a signed token, and returns everything the frontend needs
    to run the MediaPipe challenge-response liveness check.
    """
    election = _load_election(db, election_id)
    _validate_voter_election_state(db, voter, election)

    # Check retry state
    retry = _compute_retry_state(db, voter.id, election.id)
    if retry["is_locked"]:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Face verification temporarily locked for this election",
                "locked_until": retry["locked_until"].isoformat(),
                "remaining_attempts": 0,
            },
            headers={
                "Retry-After": str(
                    int((retry["locked_until"] - datetime.now(timezone.utc)).total_seconds())
                )
            },
        )

    # Enforce cooldown
    if retry["cooldown_seconds"] > 0:
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Please wait {retry['cooldown_seconds']} seconds before retrying",
                "cooldown_seconds": retry["cooldown_seconds"],
                "remaining_attempts": retry["remaining_attempts"],
            },
            headers={"Retry-After": str(retry["cooldown_seconds"])},
        )

    # Validate stored enrollment face exists on disk
    if not face_provider.validate_enrollment_face(voter.face_image_path):
        raise HTTPException(
            status_code=400,
            detail="Stored enrollment face image is missing or invalid. Contact support.",
        )

    # Generate session nonce (replaces AWS provider session ID)
    session_nonce = str(uuid.uuid4())

    # Pick random challenge actions for the frontend liveness check
    challenges = _pick_challenges()

    # Issue signed token binding voter + election + nonce
    token, expires_at = _create_verification_token(
        voter_id=voter.id,
        election_id=election.id,
        government_level=election.government_level,
        provider_session_id=session_nonce,
    )

    # Audit
    _audit(
        db,
        action="VOTE_FACE_SESSION_STARTED",
        voter_id=voter.id,
        request=request,
        metadata={
            "election_id": election.id,
            "government_level": election.government_level,
            "provider": face_provider.PROVIDER_NAME,
            "session_nonce": session_nonce,
            "challenges": challenges,
            "remaining_attempts": retry["remaining_attempts"],
        },
    )
    db.commit()

    return {
        "provider": face_provider.PROVIDER_NAME,
        "verification_context_token": token,
        "expires_at": expires_at.isoformat(),
        "challenges": challenges,
        "camera_mode": "user",
        "max_attempts": settings.FACE_VERIFY_MAX_FAILURES,
        "remaining_attempts": retry["remaining_attempts"],
    }


# ── Core verify-then-cast orchestration ─────────────────────────


def _verify_face(
    db: Session,
    voter: User,
    election: Election,
    token_payload: dict,
    captured_frame_base64: str,
    request: Request | None = None,
) -> dict | None:
    """Run face verification using CompreFace comparison.

    Liveness is enforced browser-side by MediaPipe challenge-response.
    This function handles replay protection, face comparison, and audit.

    Returns None on success, or a failure dict (with HTTP status code) on failure.
    """
    session_nonce = token_payload["psid"]
    meta_base = {
        "election_id": election.id,
        "government_level": election.government_level,
        "provider": face_provider.PROVIDER_NAME,
        "session_nonce": session_nonce,
    }

    # Replay check — nonce must not have been used before
    if is_provider_session_id_used(db, session_nonce):
        raise HTTPException(
            status_code=400,
            detail="This verification session has already been used",
        )

    # Validate captured frame is present
    if not captured_frame_base64 or len(captured_frame_base64) < 100:
        return _record_failure(
            db, voter, election, request,
            reason_code="NO_CAPTURED_FRAME",
            match_score=None,
            meta_base=meta_base,
        )

    # Compare captured frame against stored enrollment face via CompreFace
    try:
        comparison = face_provider.compare_faces(
            source_image_path=voter.face_image_path,
            target_image_base64=captured_frame_base64,
        )
    except RuntimeError as exc:
        logger.error("Face comparison error: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Face comparison service unavailable. Try again.",
        )

    if not comparison.is_match:
        return _record_failure(
            db, voter, election, request,
            reason_code="FACE_MISMATCH",
            match_score=comparison.similarity,
            meta_base=meta_base,
        )

    # Verification passed — write audit into same session (committed with ballot)
    _audit(
        db,
        action="VOTE_FACE_VERIFY_PASSED",
        voter_id=voter.id,
        request=request,
        metadata={
            **meta_base,
            "match_score": comparison.similarity,
        },
    )

    return None  # success


def _record_failure(
    db: Session,
    voter: User,
    election: Election,
    request: Request | None,
    *,
    reason_code: str,
    match_score: float | None,
    meta_base: dict,
) -> dict:
    """Record a verification failure, possibly triggering a lock.

    Returns a dict describing the failure for the HTTP response.
    """
    # Pre-count (before adding this failure)
    max_failures = settings.FACE_VERIFY_MAX_FAILURES
    window_min = settings.FACE_VERIFY_OBSERVATION_WINDOW_MINUTES
    lock_min = settings.FACE_VERIFY_LOCK_DURATION_MINUTES

    current_count = count_recent_vote_face_failures(
        db, voter.id, election.id, window_min
    )
    new_count = current_count + 1
    remaining = max(0, max_failures - new_count)
    locked_until = None

    failure_meta = {
        **meta_base,
        "reason_code": reason_code,
        "match_score": match_score,
        "remaining_attempts": remaining,
        "locked_until": None,
    }

    _audit(
        db,
        action="VOTE_FACE_VERIFY_FAILED",
        voter_id=voter.id,
        outcome="FAILURE",
        request=request,
        metadata=failure_meta,
    )

    # Check if this failure triggers a lock
    if new_count >= max_failures:
        locked_until = datetime.now(timezone.utc) + timedelta(minutes=lock_min)
        lock_meta = {
            **meta_base,
            "reason_code": "FACE_LOCKED",
            "remaining_attempts": 0,
            "locked_until": locked_until.isoformat(),
        }
        _audit(
            db,
            action="VOTE_FACE_VERIFY_LOCKED",
            voter_id=voter.id,
            outcome="FAILURE",
            request=request,
            metadata=lock_meta,
        )

    db.commit()

    if locked_until:
        return {
            "status_code": 429,
            "detail": "Face verification temporarily locked for this election",
            "reason_code": "FACE_LOCKED",
            "remaining_attempts": 0,
            "locked_until": locked_until.isoformat(),
        }

    return {
        "status_code": 403,
        "detail": "Face verification failed",
        "reason_code": reason_code,
        "remaining_attempts": remaining,
        "locked_until": None,
    }


def _validate_token_for_cast(
    token: str, voter: User, election_id: int
) -> dict:
    """Decode and validate the verification token against the current request."""
    payload = _decode_verification_token(token)

    if int(payload["sub"]) != voter.id:
        raise HTTPException(status_code=403, detail="Verification token does not match current voter")
    if payload["eid"] != election_id:
        raise HTTPException(status_code=403, detail="Verification token does not match this election")

    return payload


# ── Verify-and-cast: dual ballot (federal / provincial) ─────────


def verify_and_cast_dual(
    db: Session,
    election_id: int,
    voter: User,
    verification_context_token: str,
    captured_frame_base64: str,
    fptp_nomination_id: int | None,
    pr_party_id: int | None,
    request: Request | None = None,
) -> dict:
    """Verify the voter's face, then cast the dual ballot atomically."""
    election = _load_election(db, election_id)
    _validate_voter_election_state(db, voter, election)

    token_payload = _validate_token_for_cast(
        verification_context_token, voter, election_id
    )

    # Retry / lock check
    retry = _compute_retry_state(db, voter.id, election.id)
    if retry["is_locked"]:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Face verification temporarily locked for this election",
                "reason_code": "FACE_LOCKED",
                "remaining_attempts": 0,
                "locked_until": retry["locked_until"].isoformat(),
            },
        )

    # Run face verification
    failure = _verify_face(db, voter, election, token_payload, captured_frame_base64, request)
    if failure:
        return JSONResponse(
            status_code=failure["status_code"],
            content={
                "detail": failure["detail"],
                "reason_code": failure["reason_code"],
                "remaining_attempts": failure["remaining_attempts"],
                "locked_until": failure["locked_until"],
            },
        )

    # Face passed → cast ballot
    # VOTE_FACE_VERIFY_PASSED is already db.add()-ed; it will commit with ballot
    result = cast_dual_ballot_dispatch(
        db,
        election_id=election_id,
        voter=voter,
        fptp_nomination_id=fptp_nomination_id,
        pr_party_id=pr_party_id,
    )

    # Post-cast audit (separate commit since cast already committed)
    _audit(
        db,
        action="VOTE_CAST_AFTER_FACE_VERIFY",
        voter_id=voter.id,
        request=request,
        metadata={
            "election_id": election.id,
            "government_level": election.government_level,
            "provider": face_provider.PROVIDER_NAME,
            "session_nonce": token_payload["psid"],
            "ballot_id": result.get("ballot_id"),
        },
    )
    db.commit()

    result["verification"] = {"verified": True}
    return result


# ── Verify-and-cast: local ballot ───────────────────────────────


def verify_and_cast_local(
    db: Session,
    election_id: int,
    voter: User,
    verification_context_token: str,
    captured_frame_base64: str,
    selections: dict,
    request: Request | None = None,
) -> dict:
    """Verify the voter's face, then cast the local ballot atomically."""
    election = _load_election(db, election_id)
    _validate_voter_election_state(db, voter, election)

    token_payload = _validate_token_for_cast(
        verification_context_token, voter, election_id
    )

    # Retry / lock check
    retry = _compute_retry_state(db, voter.id, election.id)
    if retry["is_locked"]:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Face verification temporarily locked for this election",
                "reason_code": "FACE_LOCKED",
                "remaining_attempts": 0,
                "locked_until": retry["locked_until"].isoformat(),
            },
        )

    # Run face verification
    failure = _verify_face(db, voter, election, token_payload, captured_frame_base64, request)
    if failure:
        return JSONResponse(
            status_code=failure["status_code"],
            content={
                "detail": failure["detail"],
                "reason_code": failure["reason_code"],
                "remaining_attempts": failure["remaining_attempts"],
                "locked_until": failure["locked_until"],
            },
        )

    # Face passed → cast ballot
    result = cast_local_ballot_dispatch(
        db,
        election_id=election_id,
        voter=voter,
        selections=selections,
    )

    # Post-cast audit
    _audit(
        db,
        action="VOTE_CAST_AFTER_FACE_VERIFY",
        voter_id=voter.id,
        request=request,
        metadata={
            "election_id": election.id,
            "government_level": election.government_level,
            "provider": face_provider.PROVIDER_NAME,
            "session_nonce": token_payload["psid"],
            "ballot_id": result.get("ballot_id"),
        },
    )
    db.commit()

    result["verification"] = {"verified": True}
    return result
