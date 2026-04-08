"""Admin candidate management routes — profiles, FPTP nominations, PR submissions.

Route groups:
  /admin/candidates/profiles/*                        — candidate profile CRUD
  /admin/candidates/elections/{eid}/fptp-nominations/* — FPTP nomination management
  /admin/candidates/elections/{eid}/pr-submissions/*   — PR submission & list management
  /admin/candidates/elections/{eid}/readiness          — candidate-side readiness check
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.repositories import candidate_repository, election_repository
from app.schemas.candidate import (
    CandidateProfileCreate,
    CandidateProfileRead,
    CandidateProfileUpdate,
    CandidateReadiness,
    FptpNominationCreate,
    FptpNominationRead,
    FptpNominationStatusUpdate,
    PrEntryCreate,
    PrEntryRead,
    PrReorderRequest,
    PrSubmissionCreate,
    PrSubmissionRead,
    PrSubmissionReviewAction,
    PrValidationResult,
)
from app.services.candidate_service import (
    CandidateServiceError,
    create_fptp_nomination,
    create_profile,
    delete_fptp_nomination,
    delete_profile,
    update_fptp_nomination_status,
    update_profile,
)
from app.services.pr_validation_service import (
    PrValidationError,
    add_entry,
    approve_submission,
    check_candidate_readiness,
    create_submission,
    delete_submission,
    reject_submission,
    remove_entry,
    reopen_submission,
    reorder_entries,
    submit_pr_list,
    validate_pr_list,
)

router = APIRouter(prefix="/admin/candidates", tags=["candidates"])


# ── Auth guard ──────────────────────────────────────────────────

def _require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _get_election_or_404(db: Session, election_id: int):
    election = election_repository.get_by_id(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return election


# ══════════════════════════════════════════════════════════════════
#  CANDIDATE PROFILES
# ══════════════════════════════════════════════════════════════════

@router.get("/profiles", response_model=list[CandidateProfileRead])
def list_profiles(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    party_id: int | None = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    return candidate_repository.list_profiles(
        db, limit=limit, offset=offset, party_id=party_id, active_only=active_only,
    )


@router.post("/profiles", response_model=CandidateProfileRead, status_code=201)
def create_profile_endpoint(
    body: CandidateProfileCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    try:
        profile = create_profile(
            db,
            full_name=body.full_name,
            date_of_birth=body.date_of_birth,
            gender=body.gender,
            address=body.address,
            citizenship_no=body.citizenship_no,
            photo_path=body.photo_path,
            qualifications=body.qualifications,
            party_id=body.party_id,
        )
    except CandidateServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return profile


@router.get("/profiles/{profile_id}", response_model=CandidateProfileRead)
def get_profile(
    profile_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    profile = candidate_repository.get_profile_by_id(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return profile


@router.patch("/profiles/{profile_id}", response_model=CandidateProfileRead)
def update_profile_endpoint(
    profile_id: int,
    body: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    profile = candidate_repository.get_profile_by_id(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    kwargs: dict = {}
    if body.full_name is not None:
        kwargs["full_name"] = body.full_name
    for field in ("date_of_birth", "gender", "address", "citizenship_no", "photo_path", "qualifications"):
        val = getattr(body, field, None)
        if val is not None:
            kwargs[field] = val
        else:
            kwargs[field] = ...
    if body.party_id is not None:
        kwargs["party_id"] = body.party_id
    else:
        kwargs["party_id"] = ...
    if body.is_active is not None:
        kwargs["is_active"] = body.is_active
    try:
        profile = update_profile(db, profile, **kwargs)
    except CandidateServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return profile


@router.delete("/profiles/{profile_id}", status_code=204)
def delete_profile_endpoint(
    profile_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    profile = candidate_repository.get_profile_by_id(db, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    try:
        delete_profile(db, profile)
    except CandidateServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ══════════════════════════════════════════════════════════════════
#  FPTP NOMINATIONS
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/elections/{election_id}/fptp-nominations",
    response_model=list[FptpNominationRead],
)
def list_fptp_nominations(
    election_id: int,
    contest_id: int | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    _get_election_or_404(db, election_id)
    return candidate_repository.list_nominations(
        db, election_id, contest_id=contest_id, status=status, limit=limit, offset=offset,
    )


@router.post(
    "/elections/{election_id}/fptp-nominations",
    response_model=FptpNominationRead,
    status_code=201,
)
def create_fptp_nomination_endpoint(
    election_id: int,
    body: FptpNominationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = _get_election_or_404(db, election_id)
    try:
        nomination = create_fptp_nomination(
            db,
            election=election,
            contest_id=body.contest_id,
            candidate_id=body.candidate_id,
            party_id=body.party_id,
        )
    except CandidateServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return nomination


@router.patch(
    "/fptp-nominations/{nomination_id}",
    response_model=FptpNominationRead,
)
def update_fptp_nomination_endpoint(
    nomination_id: int,
    body: FptpNominationStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    nomination = candidate_repository.get_nomination_by_id(db, nomination_id)
    if not nomination:
        raise HTTPException(status_code=404, detail="Nomination not found")
    try:
        nomination = update_fptp_nomination_status(
            db, nomination,
            new_status=body.status,
            reviewed_by=user.id,
            notes=body.notes,
        )
    except CandidateServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return nomination


@router.delete("/fptp-nominations/{nomination_id}", status_code=204)
def delete_fptp_nomination_endpoint(
    nomination_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    nomination = candidate_repository.get_nomination_by_id(db, nomination_id)
    if not nomination:
        raise HTTPException(status_code=404, detail="Nomination not found")
    try:
        delete_fptp_nomination(db, nomination)
    except CandidateServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ══════════════════════════════════════════════════════════════════
#  PR SUBMISSIONS
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/elections/{election_id}/pr-submissions",
    response_model=list[PrSubmissionRead],
)
def list_pr_submissions(
    election_id: int,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    _get_election_or_404(db, election_id)
    return candidate_repository.list_submissions(db, election_id, limit=limit, offset=offset)


@router.post(
    "/elections/{election_id}/pr-submissions",
    response_model=PrSubmissionRead,
    status_code=201,
)
def create_pr_submission_endpoint(
    election_id: int,
    body: PrSubmissionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = _get_election_or_404(db, election_id)
    try:
        submission = create_submission(db, election=election, party_id=body.party_id)
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return submission


@router.get("/pr-submissions/{submission_id}", response_model=PrSubmissionRead)
def get_pr_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    return submission


@router.delete("/pr-submissions/{submission_id}", status_code=204)
def delete_pr_submission_endpoint(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    try:
        delete_submission(db, submission)
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/pr-submissions/{submission_id}/review",
    response_model=PrSubmissionRead,
)
def review_pr_submission(
    submission_id: int,
    body: PrSubmissionReviewAction,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    try:
        if body.action == "approve":
            submission = approve_submission(db, submission, reviewed_by=user.id, notes=body.notes)
        elif body.action == "reject":
            submission = reject_submission(db, submission, reviewed_by=user.id, notes=body.notes)
        elif body.action == "reopen":
            submission = reopen_submission(db, submission)
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return submission


# ── PR list entries ─────────────────────────────────────────────

@router.get(
    "/pr-submissions/{submission_id}/entries",
    response_model=list[PrEntryRead],
)
def list_pr_entries(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    return candidate_repository.list_entries(db, submission_id)


@router.post(
    "/pr-submissions/{submission_id}/entries",
    response_model=PrEntryRead,
    status_code=201,
)
def add_pr_entry(
    submission_id: int,
    body: PrEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    try:
        entry = add_entry(
            db, submission,
            candidate_id=body.candidate_id,
            list_position=body.list_position,
        )
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return entry


@router.delete(
    "/pr-submissions/{submission_id}/entries/{entry_id}",
    status_code=204,
)
def remove_pr_entry(
    submission_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    entry = candidate_repository.get_entry_by_id(db, entry_id)
    if not entry or entry.submission_id != submission_id:
        raise HTTPException(status_code=404, detail="Entry not found in this submission")
    try:
        remove_entry(db, submission, entry)
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/pr-submissions/{submission_id}/entries/reorder",
    response_model=list[PrEntryRead],
)
def reorder_pr_entries(
    submission_id: int,
    body: PrReorderRequest,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    try:
        entries = reorder_entries(db, submission, body.ordered_candidate_ids)
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return entries


# ── PR validation ───────────────────────────────────────────────

@router.post(
    "/pr-submissions/{submission_id}/validate",
    response_model=PrValidationResult,
)
def validate_pr_endpoint(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    return validate_pr_list(db, submission)


@router.post(
    "/pr-submissions/{submission_id}/submit",
    response_model=PrSubmissionRead,
)
def submit_pr_endpoint(
    submission_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    submission = candidate_repository.get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="PR submission not found")
    try:
        submission = submit_pr_list(db, submission)
    except PrValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return submission


# ══════════════════════════════════════════════════════════════════
#  CANDIDATE-SIDE READINESS
# ══════════════════════════════════════════════════════════════════

@router.get(
    "/elections/{election_id}/readiness",
    response_model=CandidateReadiness,
)
def candidate_readiness_endpoint(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_require_admin),
):
    election = _get_election_or_404(db, election_id)
    return check_candidate_readiness(db, election)
