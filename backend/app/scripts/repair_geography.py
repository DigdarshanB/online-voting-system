"""Safely repair contaminated geography and election data.

Detects blocking transactional data, removes test nominations/contests
tied to bad geography, resets affected elections, re-seeds canonical
geography, regenerates election structure, and validates the result.

Run: ``python -m app.scripts.repair_geography``
"""

import sys

from sqlalchemy import select, func, text

from app.db.session import SessionLocal
from app.models.ballot import Ballot
from app.models.ballot_entry import BallotEntry
from app.models.constituency import Constituency
from app.models.count_run import CountRun
from app.models.district import District
from app.models.election import Election
from app.models.election_contest import ElectionContest
from app.models.fptp_candidate_nomination import FptpCandidateNomination
from app.models.fptp_result_row import FptpResultRow
from app.models.pr_party_submission import PrPartySubmission
from app.models.pr_result_row import PrResultRow
from app.models.voter_constituency_assignment import VoterConstituencyAssignment
from app.scripts.seed_constituencies import seed as seed_geography
from app.scripts.validate_geography import validate_all


def _count(db, model):
    return db.execute(select(func.count()).select_from(model)).scalar_one()


def repair(dry_run: bool = False):
    """Repair geography and regenerate contaminated election data."""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Geography Repair Script")
        print("=" * 60)

        # ── Phase 1: Safety checks ──────────────────────────────
        print("\n1. Safety checks...")

        ballot_count = _count(db, Ballot)
        ballot_entry_count = _count(db, BallotEntry)
        count_run_count = _count(db, CountRun)
        fptp_result_count = _count(db, FptpResultRow)
        pr_result_count = _count(db, PrResultRow)
        vca_count = _count(db, VoterConstituencyAssignment)

        if ballot_count > 0 or ballot_entry_count > 0:
            print(f"  BLOCKING: {ballot_count} ballots, {ballot_entry_count} ballot entries exist.")
            print("  Cannot repair: real voting data would be destroyed.")
            print("  Aborting.")
            return False

        if count_run_count > 0 or fptp_result_count > 0 or pr_result_count > 0:
            print(f"  BLOCKING: result data exists ({count_run_count} runs, {fptp_result_count} FPTP, {pr_result_count} PR).")
            print("  Cannot repair: result data would be destroyed.")
            print("  Aborting.")
            return False

        if vca_count > 0:
            print(f"  WARNING: {vca_count} voter constituency assignments exist.")
            print("  These will be cleared (voters must be re-assigned after geography fix).")

        nomination_count = _count(db, FptpCandidateNomination)
        pr_submission_count = _count(db, PrPartySubmission)
        contest_count = _count(db, ElectionContest)
        district_count = _count(db, District)
        constituency_count = _count(db, Constituency)

        print(f"  Districts: {district_count}")
        print(f"  Constituencies: {constituency_count}")
        print(f"  Election contests: {contest_count}")
        print(f"  FPTP nominations: {nomination_count}")
        print(f"  PR submissions: {pr_submission_count}")
        print(f"  Voter assignments: {vca_count}")
        print(f"  Ballots: {ballot_count}")
        print("  Safety checks: PASSED")

        # ── Phase 2: Find affected elections ────────────────────
        print("\n2. Finding elections with generated contests...")
        elections_with_contests = list(
            db.execute(
                select(Election).where(
                    Election.id.in_(
                        select(ElectionContest.election_id).distinct()
                    )
                )
            ).scalars().all()
        )
        for e in elections_with_contests:
            print(f"  Election id={e.id}, title='{e.title}', status={e.status}")

        if dry_run:
            print("\n  DRY RUN — would delete and re-seed. Stopping here.")
            return True

        # ── Phase 3: Delete dependent data ──────────────────────
        print("\n3. Removing contaminated dependent data...")

        # 3a. Delete FPTP nominations
        if nomination_count > 0:
            db.execute(FptpCandidateNomination.__table__.delete())
            print(f"  Deleted {nomination_count} FPTP nominations")

        # 3b. Delete PR submissions
        # First check for pr_party_list_entries
        try:
            ple_count = db.execute(text("SELECT COUNT(*) FROM pr_party_list_entries")).scalar()
            if ple_count > 0:
                db.execute(text("DELETE FROM pr_party_list_entries"))
                print(f"  Deleted {ple_count} PR party list entries")
        except Exception:
            pass  # Table may not exist

        if pr_submission_count > 0:
            db.execute(PrPartySubmission.__table__.delete())
            print(f"  Deleted {pr_submission_count} PR submissions")

        # 3c. Delete election contests
        if contest_count > 0:
            db.execute(ElectionContest.__table__.delete())
            print(f"  Deleted {contest_count} election contests")

        # 3d. Reset elections to DRAFT
        for e in elections_with_contests:
            if e.status != "DRAFT":
                old_status = e.status
                e.status = "DRAFT"
                print(f"  Reset election id={e.id} from {old_status} to DRAFT")

        # 3e. Clear voter constituency assignments
        if vca_count > 0:
            db.execute(VoterConstituencyAssignment.__table__.delete())
            print(f"  Deleted {vca_count} voter constituency assignments")

        db.flush()

        # ── Phase 4: Delete and re-seed geography ───────────────
        print("\n4. Re-seeding geography from canonical JSON...")

        db.execute(Constituency.__table__.delete())
        db.execute(District.__table__.delete())
        db.flush()
        print("  Cleared old districts and constituencies")

        # Reset auto-increment to keep IDs clean
        db.execute(text("ALTER TABLE districts AUTO_INCREMENT = 1"))
        db.execute(text("ALTER TABLE constituencies AUTO_INCREMENT = 1"))
        db.flush()

        db.commit()
        print("  Committed geography cleanup")

        # Re-seed from JSON (this opens its own session)
        seed_geography(force=False)

        # Re-open session for remaining operations
        db = SessionLocal()

        # Verify
        new_d = _count(db, District)
        new_c = _count(db, Constituency)
        print(f"  New counts: {new_d} districts, {new_c} constituencies")

        # ── Phase 5: Regenerate election structure ──────────────
        print("\n5. Regenerating election structure...")
        from app.services.election_service import generate_federal_hor_structure

        # Re-fetch elections
        elections_to_regen = list(
            db.execute(
                select(Election).where(
                    Election.government_level == "FEDERAL",
                    Election.election_subtype == "HOR_DIRECT",
                    Election.status == "DRAFT",
                )
            ).scalars().all()
        )

        for e in elections_to_regen:
            result = generate_federal_hor_structure(db, e)
            print(f"  Election id={e.id}: generated {result['total_contests']} contests")

        # ── Phase 6: Validate ───────────────────────────────────
        print("\n6. Validating repaired geography...")
        validation = validate_all()

        print(f"  JSON source: {'PASS' if validation['json_valid'] else 'FAIL'}")
        for issue in validation["json_issues"]:
            print(f"    - {issue}")

        print(f"  Database: {'PASS' if validation['db_valid'] else 'FAIL'}")
        for issue in validation["db_issues"]:
            print(f"    - {issue}")

        print(f"\n  Overall: {'PASS' if validation['overall_valid'] else 'FAIL'}")

        return validation["overall_valid"]

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    success = repair(dry_run=dry)
    sys.exit(0 if success else 1)
