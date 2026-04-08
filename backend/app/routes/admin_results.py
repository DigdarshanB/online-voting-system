"""Admin results routes — count runs, results, finalization.

Endpoints:
  POST   /admin/results/{election_id}/count-runs          — initiate new count
  POST   /admin/results/count-runs/{id}/execute            — execute a pending count
  GET    /admin/results/{election_id}/count-runs            — list count runs
  GET    /admin/results/count-runs/{id}                     — get single count run
  GET    /admin/results/count-runs/{id}/summary             — result summary
  GET    /admin/results/count-runs/{id}/fptp                — FPTP result rows
  GET    /admin/results/count-runs/{id}/pr                  — PR result rows
  POST   /admin/results/count-runs/{id}/finalize            — finalize a count
  POST   /admin/results/count-runs/{id}/lock                — lock a count run
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.jwt import get_current_user
from app.db.deps import get_db
from app.models.user import User
from app.schemas.result import (
    CountRunRead,
    FptpResultRowRead,
    PrResultRowRead,
    ResultSummary,
)
from app.services.count_service import (
    CountServiceError,
    execute_count,
    finalize_count,
    get_count_run,
    get_count_runs,
    get_fptp_results,
    get_pr_results,
    get_result_summary,
    initiate_count,
    lock_count_run,
)

router = APIRouter(prefix="/admin/results", tags=["admin-results"])


def _require_admin(user: User) -> None:
    if user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")


# ── Initiate count run ──────────────────────────────────────────


@router.post("/{election_id}/count-runs", response_model=CountRunRead)
def create_count_run(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    try:
        run = initiate_count(db, election_id, current_user.id)
        db.commit()
        db.refresh(run)
        return run
    except CountServiceError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ── Execute count run ───────────────────────────────────────────


@router.post("/count-runs/{count_run_id}/execute", response_model=CountRunRead)
def run_count(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    try:
        run = execute_count(db, count_run_id)
        db.commit()
        db.refresh(run)
        return run
    except CountServiceError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ── List count runs ─────────────────────────────────────────────


@router.get("/{election_id}/count-runs", response_model=list[CountRunRead])
def list_count_runs(
    election_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    runs = get_count_runs(db, election_id)
    return runs


# ── Get single count run ────────────────────────────────────────


@router.get("/count-runs/{count_run_id}", response_model=CountRunRead)
def get_single_count_run(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    run = get_count_run(db, count_run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Count run not found")
    return run


# ── Result summary ──────────────────────────────────────────────


@router.get("/count-runs/{count_run_id}/summary", response_model=ResultSummary)
def get_summary(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    try:
        return get_result_summary(db, count_run_id)
    except CountServiceError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── FPTP results ────────────────────────────────────────────────


@router.get("/count-runs/{count_run_id}/fptp", response_model=list[FptpResultRowRead])
def get_fptp(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    return get_fptp_results(db, count_run_id)


# ── PR results ──────────────────────────────────────────────────


@router.get("/count-runs/{count_run_id}/pr", response_model=list[PrResultRowRead])
def get_pr(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    return get_pr_results(db, count_run_id)


# ── Finalize ────────────────────────────────────────────────────


@router.post("/count-runs/{count_run_id}/finalize", response_model=CountRunRead)
def finalize(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    try:
        run = finalize_count(db, count_run_id)
        db.commit()
        db.refresh(run)
        return run
    except CountServiceError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ── Lock ────────────────────────────────────────────────────────


@router.post("/count-runs/{count_run_id}/lock", response_model=CountRunRead)
def lock(
    count_run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    try:
        run = lock_count_run(db, count_run_id)
        db.commit()
        db.refresh(run)
        return run
    except CountServiceError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
