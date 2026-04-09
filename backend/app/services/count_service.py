"""Count service — ballot decryption, FPTP tally, PR allocation (Sainte-Laguë).

ALL counting logic lives here.  The UI never computes results.

Key mathematics
───────────────
FPTP winner  = highest valid vote count in each constituency contest.
FPTP tie     = REQUIRES_ADJUDICATION — no invented automatic tie-break.

PR threshold = parties with  v_p / V_total  >= 0.03  (3 %).
PR seats     = Sainte-Laguë using divisors 1, 3, 5, 7, …
               Take the top 110 quotients only.
               Exact comparison via ``fractions.Fraction`` — no floats.
               Quotient tie at the 110th boundary → REQUIRES_ADJUDICATION.

Finalization rules
──────────────────
• Unresolved FPTP ties  → block automatic finalization.
• Unresolved PR boundary ties → block automatic finalization.
• Result locking prevents silent post-count mutation.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from fractions import Fraction

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.federal_constants import (
    CONTEST_TYPE_FPTP,
    CONTEST_TYPE_PR,
    FEDERAL_HOR_PR_SEATS,
    PR_THRESHOLD_FRACTION,
)
from app.models.ballot import Ballot
from app.models.ballot_entry import BallotEntry
from app.models.candidate_profile import CandidateProfile
from app.models.count_run import CountRun
from app.models.election import Election
from app.models.election_contest import ElectionContest
from app.models.fptp_candidate_nomination import FptpCandidateNomination
from app.models.fptp_result_row import FptpResultRow
from app.models.party import Party
from app.models.pr_result_row import PrResultRow


class CountServiceError(Exception):
    """Raised for business-rule violations in counting."""


# ── Decryption ──────────────────────────────────────────────────


def _get_aesgcm() -> AESGCM:
    key = bytes.fromhex(settings.BALLOT_ENCRYPTION_KEY)
    return AESGCM(key)


def _decrypt_choice(ciphertext: bytes, nonce: bytes) -> dict:
    """Decrypt an AES-256-GCM ballot entry back to its JSON payload."""
    plaintext = _get_aesgcm().decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))


# ── Public API ──────────────────────────────────────────────────


def initiate_count(db: Session, election_id: int, admin_id: int) -> CountRun:
    """Create a new count run.  Election must be in POLLING_CLOSED or COUNTING."""
    election = db.get(Election, election_id)
    if not election:
        raise CountServiceError("Election not found")
    if election.status not in ("POLLING_CLOSED", "COUNTING"):
        raise CountServiceError(
            f"Cannot start count: election status is '{election.status}', "
            "must be POLLING_CLOSED or COUNTING"
        )

    # Mark any previous non-locked runs as superseded (only latest matters)
    existing = db.execute(
        select(CountRun).where(
            CountRun.election_id == election_id,
            CountRun.is_locked == False,  # noqa: E712
        )
    ).scalars().all()
    for run in existing:
        if run.status == "RUNNING":
            raise CountServiceError("A count is already running for this election")

    count_run = CountRun(
        election_id=election_id,
        status="PENDING",
        created_by=admin_id,
    )
    db.add(count_run)
    db.flush()

    # Transition election to COUNTING if not already
    if election.status == "POLLING_CLOSED":
        election.status = "COUNTING"
        election.counting_start_at = datetime.now(timezone.utc)
        db.flush()

    return count_run


def execute_count(db: Session, count_run_id: int) -> CountRun:
    """Run the full tally: decrypt ballots → FPTP → PR → store results."""
    count_run = db.get(CountRun, count_run_id)
    if not count_run:
        raise CountServiceError("Count run not found")
    if count_run.status != "PENDING":
        raise CountServiceError(f"Count run status is '{count_run.status}', expected PENDING")
    if count_run.is_locked:
        raise CountServiceError("Count run is locked — cannot re-execute")

    count_run.status = "RUNNING"
    db.flush()

    try:
        election_id = count_run.election_id

        # ── 1. Load all ballot entries for this election ────────
        entries = db.execute(
            select(BallotEntry)
            .join(Ballot, BallotEntry.ballot_id == Ballot.id)
            .where(Ballot.election_id == election_id)
        ).scalars().all()

        # Count distinct ballots
        ballot_ids = {e.ballot_id for e in entries}
        count_run.total_ballots_counted = len(ballot_ids)

        # ── 2. Decrypt and bucket ──────────────────────────────
        fptp_votes: dict[int, list[int]] = defaultdict(list)   # contest_id → [nomination_id, ...]
        pr_votes: list[int] = []                                # [party_id, ...]

        for entry in entries:
            payload = _decrypt_choice(entry.encrypted_choice, entry.nonce)
            if entry.ballot_type == CONTEST_TYPE_FPTP:
                fptp_votes[payload["contest_id"]].append(payload["nomination_id"])
            elif entry.ballot_type == CONTEST_TYPE_PR:
                pr_votes.append(payload["party_id"])

        # ── 3. FPTP tally ──────────────────────────────────────
        fptp_adj = _tally_fptp(db, count_run, fptp_votes)

        # ── 4. PR tally + Sainte-Laguë allocation ──────────────
        pr_adj = _tally_pr(db, count_run, pr_votes)

        count_run.total_fptp_adjudication = fptp_adj
        count_run.total_pr_adjudication = pr_adj
        count_run.status = "COMPLETED"
        count_run.completed_at = datetime.now(timezone.utc)
        db.flush()

    except Exception as exc:
        count_run.status = "FAILED"
        count_run.error_message = str(exc)[:2000]
        count_run.completed_at = datetime.now(timezone.utc)
        db.flush()
        raise CountServiceError(f"Count failed: {exc}") from exc

    return count_run


def finalize_count(db: Session, count_run_id: int) -> CountRun:
    """Attempt to finalize a completed count run.

    Blocks if unresolved FPTP ties or PR boundary ties exist.
    On success, marks the run as final and the election as FINALIZED.
    """
    count_run = db.get(CountRun, count_run_id)
    if not count_run:
        raise CountServiceError("Count run not found")
    if count_run.status != "COMPLETED":
        raise CountServiceError(
            f"Cannot finalize: count run status is '{count_run.status}', expected COMPLETED"
        )
    if count_run.is_final:
        raise CountServiceError("Count run is already finalized")

    # ── Check for unresolved adjudication ───────────────────────
    if count_run.total_fptp_adjudication > 0:
        raise CountServiceError(
            f"Cannot finalize: {count_run.total_fptp_adjudication} FPTP contest(s) "
            "require adjudication (unresolved ties)"
        )
    if count_run.total_pr_adjudication > 0:
        raise CountServiceError(
            f"Cannot finalize: {count_run.total_pr_adjudication} PR seat-boundary "
            "quotient tie(s) require adjudication"
        )

    count_run.is_final = True
    count_run.is_locked = True

    # Transition election
    election = db.get(Election, count_run.election_id)
    if election and election.status == "COUNTING":
        election.status = "FINALIZED"
        election.result_publish_at = datetime.now(timezone.utc)
    db.flush()
    return count_run


def lock_count_run(db: Session, count_run_id: int) -> CountRun:
    """Lock a completed count run to prevent post-count mutation."""
    count_run = db.get(CountRun, count_run_id)
    if not count_run:
        raise CountServiceError("Count run not found")
    if count_run.status not in ("COMPLETED", "FAILED"):
        raise CountServiceError("Can only lock a completed or failed count run")
    count_run.is_locked = True
    db.flush()
    return count_run


def get_count_runs(db: Session, election_id: int) -> list[CountRun]:
    """Return all count runs for an election, newest first."""
    return (
        db.execute(
            select(CountRun)
            .where(CountRun.election_id == election_id)
            .order_by(CountRun.started_at.desc())
        )
        .scalars()
        .all()
    )


def get_count_run(db: Session, count_run_id: int) -> CountRun | None:
    return db.get(CountRun, count_run_id)


def get_fptp_results(db: Session, count_run_id: int) -> list[FptpResultRow]:
    return (
        db.execute(
            select(FptpResultRow)
            .where(FptpResultRow.count_run_id == count_run_id)
            .order_by(FptpResultRow.contest_id, FptpResultRow.rank)
        )
        .scalars()
        .all()
    )


def get_pr_results(db: Session, count_run_id: int) -> list[PrResultRow]:
    return (
        db.execute(
            select(PrResultRow)
            .where(PrResultRow.count_run_id == count_run_id)
            .order_by(PrResultRow.allocated_seats.desc(), PrResultRow.valid_votes.desc())
        )
        .scalars()
        .all()
    )


def enrich_fptp_results(db: Session, rows: list[FptpResultRow]) -> list[dict]:
    """Hydrate candidate_photo_path and party_symbol_path onto FPTP result rows."""
    if not rows:
        return []
    nomination_ids = list({r.nomination_id for r in rows})
    img_rows = db.execute(
        select(
            FptpCandidateNomination.id,
            CandidateProfile.photo_path,
            Party.symbol_path,
        )
        .join(CandidateProfile, FptpCandidateNomination.candidate_id == CandidateProfile.id)
        .outerjoin(Party, FptpCandidateNomination.party_id == Party.id)
        .where(FptpCandidateNomination.id.in_(nomination_ids))
    ).all()
    lookup = {row[0]: (row[1], row[2]) for row in img_rows}
    enriched = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        photo, symbol = lookup.get(r.nomination_id, (None, None))
        d["candidate_photo_path"] = photo
        d["party_symbol_path"] = symbol
        enriched.append(d)
    return enriched


def enrich_pr_results(db: Session, rows: list[PrResultRow]) -> list[dict]:
    """Hydrate party_symbol_path onto PR result rows."""
    if not rows:
        return []
    party_ids = list({r.party_id for r in rows})
    sym_rows = db.execute(
        select(Party.id, Party.symbol_path).where(Party.id.in_(party_ids))
    ).all()
    lookup = {row[0]: row[1] for row in sym_rows}
    enriched = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        d["party_symbol_path"] = lookup.get(r.party_id)
        enriched.append(d)
    return enriched


def get_result_summary(db: Session, count_run_id: int) -> dict:
    """Return a high-level summary of count results."""
    count_run = db.get(CountRun, count_run_id)
    if not count_run:
        raise CountServiceError("Count run not found")

    fptp_rows = get_fptp_results(db, count_run_id)
    pr_rows = get_pr_results(db, count_run_id)

    # FPTP winners
    fptp_winners = [r for r in fptp_rows if r.is_winner]
    fptp_adj_contests = len({r.contest_id for r in fptp_rows if r.requires_adjudication})

    # PR summary
    pr_qualified = [r for r in pr_rows if r.meets_threshold]
    pr_total_seats = sum(r.allocated_seats for r in pr_rows)
    pr_adj = any(r.requires_adjudication for r in pr_rows)

    # Total PR seats from election's PR contest(s)
    pr_contests = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == count_run.election_id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
        )
    ).scalars().all()
    total_pr_seats = sum(c.seat_count for c in pr_contests) if pr_contests else FEDERAL_HOR_PR_SEATS

    return {
        "count_run_id": count_run.id,
        "election_id": count_run.election_id,
        "status": count_run.status,
        "is_final": count_run.is_final,
        "is_locked": count_run.is_locked,
        "total_ballots_counted": count_run.total_ballots_counted,
        "fptp": {
            "total_contests": len({r.contest_id for r in fptp_rows}),
            "winners_declared": len(fptp_winners),
            "adjudication_required": fptp_adj_contests,
        },
        "pr": {
            "total_valid_votes": sum(r.valid_votes for r in pr_rows),
            "parties_qualified": len(pr_qualified),
            "seats_allocated": pr_total_seats,
            "total_seats": total_pr_seats,
            "adjudication_required": 1 if pr_adj else 0,
        },
        "can_finalize": (
            count_run.status == "COMPLETED"
            and not count_run.is_final
            and fptp_adj_contests == 0
            and not pr_adj
        ),
        "started_at": count_run.started_at.isoformat() if count_run.started_at else None,
        "completed_at": count_run.completed_at.isoformat() if count_run.completed_at else None,
    }


# ── Internal: FPTP tally ───────────────────────────────────────


def _tally_fptp(
    db: Session,
    count_run: CountRun,
    fptp_votes: dict[int, list[int]],
) -> int:
    """Tally FPTP votes for every contest.  Returns count of contests requiring adjudication."""
    election_id = count_run.election_id

    # Load all FPTP contests for this election
    contests = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_FPTP,
        )
    ).scalars().all()

    # Load approved nominations with candidate/party names
    nominations = db.execute(
        select(
            FptpCandidateNomination.id,
            FptpCandidateNomination.contest_id,
            CandidateProfile.full_name,
            Party.name.label("party_name"),
        )
        .join(CandidateProfile, FptpCandidateNomination.candidate_id == CandidateProfile.id)
        .outerjoin(Party, FptpCandidateNomination.party_id == Party.id)
        .where(
            FptpCandidateNomination.election_id == election_id,
            FptpCandidateNomination.status == "APPROVED",
        )
    ).all()

    nom_lookup: dict[int, dict] = {}
    contest_noms: dict[int, list[int]] = defaultdict(list)
    for row in nominations:
        nom_lookup[row.id] = {
            "candidate_name": row.full_name,
            "party_name": row.party_name,
        }
        contest_noms[row.contest_id].append(row.id)

    adjudication_count = 0

    for contest in contests:
        votes_for_contest = fptp_votes.get(contest.id, [])

        # Count per nomination
        tally: dict[int, int] = defaultdict(int)
        for nom_id in votes_for_contest:
            if nom_id in nom_lookup:
                tally[nom_id] += 1

        # Ensure all approved nominations appear, even with 0 votes
        for nom_id in contest_noms.get(contest.id, []):
            if nom_id not in tally:
                tally[nom_id] = 0

        if not tally:
            continue

        # Sort by vote count descending
        sorted_noms = sorted(tally.items(), key=lambda x: x[1], reverse=True)
        max_votes = sorted_noms[0][1] if sorted_noms else 0

        # Check for tie at the top
        top_count = sum(1 for _, v in sorted_noms if v == max_votes)
        is_tie = top_count > 1 and max_votes > 0
        if is_tie:
            adjudication_count += 1

        for rank_idx, (nom_id, vote_count) in enumerate(sorted_noms, start=1):
            info = nom_lookup.get(nom_id, {"candidate_name": "Unknown", "party_name": None})
            row = FptpResultRow(
                count_run_id=count_run.id,
                contest_id=contest.id,
                nomination_id=nom_id,
                candidate_name=info["candidate_name"],
                party_name=info["party_name"],
                vote_count=vote_count,
                rank=rank_idx,
                is_winner=(rank_idx == 1 and not is_tie),
                requires_adjudication=is_tie and vote_count == max_votes,
            )
            db.add(row)

    db.flush()
    return adjudication_count


# ── Internal: PR tally + Sainte-Laguë ──────────────────────────


def _tally_pr(
    db: Session,
    count_run: CountRun,
    pr_votes: list[int],
) -> int:
    """Tally PR votes, apply threshold, allocate seats via Sainte-Laguë.

    Reads ``seat_count`` from the election's PR contest(s) instead of
    hardcoding a federal constant, so this works for any election level.

    Returns 1 if a boundary quotient tie requires adjudication, 0 otherwise.
    Uses ``fractions.Fraction`` for exact rational arithmetic — no floats.
    """
    election_id = count_run.election_id

    # ── Determine seat count from the election's PR contest(s) ───
    pr_contests = db.execute(
        select(ElectionContest).where(
            ElectionContest.election_id == election_id,
            ElectionContest.contest_type == CONTEST_TYPE_PR,
        )
    ).scalars().all()

    seats_to_allocate = sum(c.seat_count for c in pr_contests) if pr_contests else FEDERAL_HOR_PR_SEATS

    # Count votes per party
    vote_count: dict[int, int] = defaultdict(int)
    for party_id in pr_votes:
        vote_count[party_id] += 1

    total_valid = sum(vote_count.values())

    # Load party names
    party_ids = list(vote_count.keys())
    parties = {}
    if party_ids:
        rows = db.execute(
            select(Party.id, Party.name).where(Party.id.in_(party_ids))
        ).all()
        parties = {r.id: r.name for r in rows}

    # ── Threshold check (exact via Fraction) ─────────────────────
    threshold = Fraction(PR_THRESHOLD_FRACTION)
    qualifying: dict[int, int] = {}   # party_id → votes
    non_qualifying: dict[int, int] = {}

    for pid, votes in vote_count.items():
        if total_valid > 0 and Fraction(votes, total_valid) >= threshold:
            qualifying[pid] = votes
        else:
            non_qualifying[pid] = votes

    # ── Sainte-Laguë allocation (exact) ──────────────────────────
    allocated: dict[int, int] = {pid: 0 for pid in qualifying}
    adjudication_required = 0

    # Store each party's last-winning quotient info
    last_quotient_info: dict[int, tuple[int, int]] = {}  # pid → (numerator, divisor)

    if qualifying and total_valid > 0:
        # Generate quotient pool: each entry is (Fraction, party_id, divisor)
        quotient_pool: list[tuple[Fraction, int, int]] = []
        for pid, votes in qualifying.items():
            # Sainte-Laguë divisors: 1, 3, 5, 7, ... (2*s + 1 for s=0,1,2,...)
            # We need at most seats_to_allocate divisors per party
            for s in range(seats_to_allocate):
                divisor = 2 * s + 1
                quotient = Fraction(votes, divisor)
                quotient_pool.append((quotient, pid, divisor))

        # Sort descending by quotient.  Fraction comparison is exact.
        # Secondary sort by party_id for determinism within same quotient
        # (but same quotient = tie → adjudication, so ordering doesn't matter
        #  for correctness; we just need stability).
        quotient_pool.sort(key=lambda x: (-x[0], x[1]))

        # Take top N seats
        if len(quotient_pool) >= seats_to_allocate:
            cutoff_quotient = quotient_pool[seats_to_allocate - 1][0]

            # Check for tie at the boundary
            if len(quotient_pool) > seats_to_allocate:
                next_quotient = quotient_pool[seats_to_allocate][0]
                if next_quotient == cutoff_quotient:
                    adjudication_required = 1

            # Allocate seats (take exactly the top seats_to_allocate)
            for i in range(seats_to_allocate):
                _, pid, divisor = quotient_pool[i]
                allocated[pid] += 1
                last_quotient_info[pid] = (qualifying[pid], divisor)
        else:
            # Fewer quotients than seats (unlikely); allocate all
            for _, pid, divisor in quotient_pool:
                allocated[pid] += 1
                last_quotient_info[pid] = (qualifying[pid], divisor)

    # ── Store PR result rows ────────────────────────────────────
    all_party_ids = set(vote_count.keys())
    for pid in all_party_ids:
        votes = vote_count[pid]
        vote_share = (
            Decimal(str(votes)) / Decimal(str(total_valid)) * Decimal("100")
            if total_valid > 0
            else Decimal("0")
        )
        meets = pid in qualifying
        seats = allocated.get(pid, 0)
        q_info = last_quotient_info.get(pid)

        row = PrResultRow(
            count_run_id=count_run.id,
            party_id=pid,
            party_name=parties.get(pid, "Unknown"),
            valid_votes=votes,
            vote_share_pct=float(round(vote_share, 6)),
            meets_threshold=meets,
            allocated_seats=seats,
            highest_quotient_numerator=q_info[0] if q_info else None,
            highest_quotient_divisor=q_info[1] if q_info else None,
            requires_adjudication=(adjudication_required == 1 and meets and seats > 0),
        )
        db.add(row)

    db.flush()
    return adjudication_required
