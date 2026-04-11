"""Integration test: Local election full lifecycle.

Simulates the complete local election workflow:
  1. Verify ward data existence and area_unit counts
  2. Create a LOCAL_RURAL election (simpler: 466 rural municipalities)
  3. Generate contest structure via election_service._generate_local()
  4. Pick ONE rural municipality with its wards for voting test
  5. Create parties, candidates, nominations for all 6 contest types
  6. Cast encrypted ballots (2 head + 4 ward per voter)
  7. Run counting (local direct tally, no PR)
  8. Verify results: FPTP tallies, WARD_MEMBER_OPEN top-two winners
  9. Finalize → verify immutability
 10. Query local result summary
 11. Also test LOCAL_MUNICIPAL structure generation
"""

import json
import os
import random
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy import delete, select, func

from app.core.config import settings
from app.core.election_constants import (
    CONTEST_TYPE_MAYOR,
    CONTEST_TYPE_DEPUTY_MAYOR,
    CONTEST_TYPE_WARD_CHAIR,
    CONTEST_TYPE_WARD_WOMAN_MEMBER,
    CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER,
    CONTEST_TYPE_WARD_MEMBER_OPEN,
    ALL_LOCAL_CONTEST_TYPES,
    LOCAL_HEAD_CONTEST_TYPES,
    LOCAL_WARD_CONTEST_TYPES,
    LOCAL_BODY_CATEGORIES,
    URBAN_LOCAL_BODY_CATEGORIES,
    RURAL_LOCAL_BODY_CATEGORIES,
)
from app.db.deps import SessionLocal
from app.models.area_unit import AreaUnit
from app.models.ballot import Ballot
from app.models.ballot_entry import BallotEntry
from app.models.candidate_profile import CandidateProfile
from app.models.count_run import CountRun
from app.models.election import Election
from app.models.election_contest import ElectionContest
from app.models.fptp_candidate_nomination import FptpCandidateNomination
from app.models.fptp_result_row import FptpResultRow
from app.models.user import User
from app.services.count_service import (
    CountServiceError,
    execute_count,
    finalize_count,
    get_fptp_results,
    get_local_result_summary,
    get_result_summary,
    initiate_count,
)
from app.services.election_service import (
    ElectionServiceError,
    _generate_local,
    check_structure_readiness,
)

# ── Constants ───────────────────────────────────────────────────

NUM_PARTIES = 3
VOTERS_PER_WARD = 10
# We test with ONE rural municipality and its wards to keep timing manageable


def _encrypt_choice(payload: dict) -> tuple[bytes, bytes]:
    key = bytes.fromhex(settings.BALLOT_ENCRYPTION_KEY)
    aesgcm = AESGCM(key)
    plaintext = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ciphertext, nonce


def cleanup(db, election_ids, user_ids, party_ids, candidate_ids):
    """Clean up test data in reverse dependency order."""
    for election_id in election_ids:
        # Delete count results
        run_ids = [
            r.id
            for r in db.execute(
                select(CountRun.id).where(CountRun.election_id == election_id)
            ).all()
        ]
        if run_ids:
            db.execute(delete(FptpResultRow).where(FptpResultRow.count_run_id.in_(run_ids)))
            db.execute(delete(CountRun).where(CountRun.election_id == election_id))

        # Delete ballot entries and ballots
        ballot_ids = [
            b.id
            for b in db.execute(
                select(Ballot.id).where(Ballot.election_id == election_id)
            ).all()
        ]
        if ballot_ids:
            db.execute(delete(BallotEntry).where(BallotEntry.ballot_id.in_(ballot_ids)))
            db.execute(delete(Ballot).where(Ballot.election_id == election_id))

        # Delete nominations
        contest_ids = [
            c.id
            for c in db.execute(
                select(ElectionContest.id).where(
                    ElectionContest.election_id == election_id
                )
            ).all()
        ]
        if contest_ids:
            db.execute(
                delete(FptpCandidateNomination).where(
                    FptpCandidateNomination.contest_id.in_(contest_ids)
                )
            )

        # Delete contests
        db.execute(delete(ElectionContest).where(ElectionContest.election_id == election_id))

        # Delete election
        db.execute(delete(Election).where(Election.id == election_id))

    # Delete candidates
    if candidate_ids:
        db.execute(delete(CandidateProfile).where(CandidateProfile.id.in_(candidate_ids)))

    # Delete parties
    from app.models.party import Party
    if party_ids:
        db.execute(delete(Party).where(Party.id.in_(party_ids)))

    # Delete test users
    if user_ids:
        db.execute(delete(User).where(User.id.in_(user_ids)))

    db.commit()


# ── Assertions ──────────────────────────────────────────────────

passed = 0
failed = 0


def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {label}")
    else:
        failed += 1
        msg = f"  ✗ {label}"
        if detail:
            msg += f" — {detail}"
        print(msg)


def run_test():
    global passed, failed
    passed = 0
    failed = 0

    db = SessionLocal()
    election_ids = []
    user_ids = []
    party_ids = []
    candidate_ids = []

    try:
        print("=" * 70)
        print("LOCAL ELECTION FULL LIFECYCLE INTEGRATION TEST")
        print("=" * 70)

        # ── Find admin user ─────────────────────────────────────
        admin = db.execute(
            select(User).where(User.role.in_(("admin", "super_admin")))
        ).scalars().first()
        if not admin:
            print("SKIP: No admin user found in the database.")
            return
        admin_id = admin.id
        print(f"Using admin: {admin.full_name} (id={admin_id})")

        # ════════════════════════════════════════════════════════
        # PHASE 1: Ward data & area_unit verification
        # ════════════════════════════════════════════════════════
        print("\n[1] Verifying ward data in area_units...")

        ward_count = db.execute(
            select(func.count()).select_from(AreaUnit).where(AreaUnit.category == "WARD")
        ).scalar_one()
        check("Wards exist in area_units", ward_count > 0, f"found {ward_count}")
        check("Ward count = 6743", ward_count == 6743, f"got {ward_count}")

        # Count local body types
        lb_count = db.execute(
            select(func.count()).select_from(AreaUnit)
            .where(AreaUnit.category.in_(LOCAL_BODY_CATEGORIES))
        ).scalar_one()
        check("Local bodies = 753", lb_count == 753, f"got {lb_count}")

        rural_count = db.execute(
            select(func.count()).select_from(AreaUnit)
            .where(AreaUnit.category == "RURAL_MUNICIPALITY")
        ).scalar_one()
        check("Rural municipalities = 466", rural_count == 466, f"got {rural_count}")

        urban_count = db.execute(
            select(func.count()).select_from(AreaUnit)
            .where(AreaUnit.category.in_(URBAN_LOCAL_BODY_CATEGORIES))
        ).scalar_one()
        check("Urban local bodies = 287", urban_count == 287, f"got {urban_count}")

        # ════════════════════════════════════════════════════════
        # PHASE 2: LOCAL_RURAL structure generation
        # ════════════════════════════════════════════════════════
        print("\n[2] Creating LOCAL_RURAL election and generating structure...")

        now = datetime.now(timezone.utc)
        rural_election = Election(
            title="Test Local Rural Election — Full Lifecycle",
            description="Integration test — rural municipality elections",
            election_type="LOCAL_RURAL",
            government_level="LOCAL",
            election_subtype="LOCAL_RURAL",
            status="DRAFT",
            start_time=now - timedelta(hours=12),
            end_time=now - timedelta(hours=1),
            polling_start_at=now - timedelta(hours=12),
            polling_end_at=now - timedelta(hours=1),
            created_by=admin_id,
        )
        db.add(rural_election)
        db.flush()
        election_ids.append(rural_election.id)
        print(f"  Rural election id={rural_election.id}")

        result = _generate_local(db, rural_election)
        db.flush()

        print(f"  Structure result: {json.dumps(result, indent=2)}")

        # Expected: 466 rural municipalities
        check(
            "Mayor (Chair) contests = 466",
            result["mayor_contests_created"] == 466,
            f"got {result['mayor_contests_created']}",
        )
        check(
            "Deputy (Vice Chair) contests = 466",
            result["deputy_mayor_contests_created"] == 466,
            f"got {result['deputy_mayor_contests_created']}",
        )

        # Count wards for rural municipalities
        rural_lb_codes = [
            row[0] for row in db.execute(
                select(AreaUnit.code).where(AreaUnit.category == "RURAL_MUNICIPALITY")
            ).all()
        ]
        rural_ward_count = db.execute(
            select(func.count()).select_from(AreaUnit)
            .where(
                AreaUnit.category == "WARD",
                AreaUnit.parent_code.in_(rural_lb_codes),
            )
        ).scalar_one()
        print(f"  Rural wards: {rural_ward_count}")

        check(
            "Ward chair contests = rural ward count",
            result["ward_chair_contests_created"] == rural_ward_count,
            f"got {result['ward_chair_contests_created']} vs {rural_ward_count}",
        )
        check(
            "Ward woman contests = rural ward count",
            result["ward_woman_member_contests_created"] == rural_ward_count,
        )
        check(
            "Ward dalit woman contests = rural ward count",
            result["ward_dalit_woman_member_contests_created"] == rural_ward_count,
        )
        check(
            "Ward open contests = rural ward count",
            result["ward_member_open_contests_created"] == rural_ward_count,
        )

        expected_total = (2 * 466) + (4 * rural_ward_count)
        check(
            f"Total contests = {expected_total}",
            result["total_contests"] == expected_total,
            f"got {result['total_contests']}",
        )

        # ── Readiness check ─────────────────────────────────────
        readiness = check_structure_readiness(db, rural_election)
        check("Structure readiness: ready", readiness["ready"], str(readiness.get("issues", [])))

        # Clean up rural structure for the voting test (we'll use a smaller election)
        db.execute(delete(ElectionContest).where(ElectionContest.election_id == rural_election.id))
        db.execute(delete(Election).where(Election.id == rural_election.id))
        election_ids.remove(rural_election.id)
        db.flush()
        print("  (Cleaned up full rural structure for focused voting test)")

        # ════════════════════════════════════════════════════════
        # PHASE 3: LOCAL_MUNICIPAL structure generation
        # ════════════════════════════════════════════════════════
        print("\n[3] Creating LOCAL_MUNICIPAL election and generating structure...")

        municipal_election = Election(
            title="Test Local Municipal Election — Structure",
            description="Integration test — urban municipality elections",
            election_type="LOCAL_MUNICIPAL",
            government_level="LOCAL",
            election_subtype="LOCAL_MUNICIPAL",
            status="DRAFT",
            start_time=now - timedelta(hours=12),
            end_time=now - timedelta(hours=1),
            polling_start_at=now - timedelta(hours=12),
            polling_end_at=now - timedelta(hours=1),
            created_by=admin_id,
        )
        db.add(municipal_election)
        db.flush()
        election_ids.append(municipal_election.id)

        muni_result = _generate_local(db, municipal_election)
        db.flush()

        print(f"  Structure result: mayor={muni_result['mayor_contests_created']}, "
              f"deputy={muni_result['deputy_mayor_contests_created']}, "
              f"wards={muni_result['wards']}, total={muni_result['total_contests']}")

        check(
            "Municipal Mayor contests = 287",
            muni_result["mayor_contests_created"] == 287,
            f"got {muni_result['mayor_contests_created']}",
        )
        check(
            "Municipal Deputy contests = 287",
            muni_result["deputy_mayor_contests_created"] == 287,
            f"got {muni_result['deputy_mayor_contests_created']}",
        )

        # Readiness
        muni_readiness = check_structure_readiness(db, municipal_election)
        check("Municipal readiness: ready", muni_readiness["ready"], str(muni_readiness.get("issues", [])))

        # Clean up municipal structure
        db.execute(delete(ElectionContest).where(ElectionContest.election_id == municipal_election.id))
        db.execute(delete(Election).where(Election.id == municipal_election.id))
        election_ids.remove(municipal_election.id)
        db.flush()
        print("  (Cleaned up municipal structure)")

        # ════════════════════════════════════════════════════════
        # PHASE 4: Focused voting test — one rural municipality
        # ════════════════════════════════════════════════════════
        print("\n[4] Setting up focused voting test (one rural municipality)...")

        # Pick a rural municipality with a small number of wards
        # for a manageable test
        test_lb = db.execute(
            select(AreaUnit)
            .where(AreaUnit.category == "RURAL_MUNICIPALITY")
            .order_by(AreaUnit.code)
        ).scalars().first()

        if not test_lb:
            print("SKIP: No rural municipality found.")
            return

        test_wards = db.execute(
            select(AreaUnit)
            .where(
                AreaUnit.category == "WARD",
                AreaUnit.parent_code == test_lb.code,
            )
            .order_by(AreaUnit.ward_number)
        ).scalars().all()

        num_wards = len(test_wards)
        print(f"  Test body: {test_lb.name} ({test_lb.code}), {num_wards} wards")
        check("Test body has wards", num_wards > 0, f"found {num_wards}")

        # Create a small LOCAL_RURAL election in POLLING_CLOSED state
        focus_election = Election(
            title=f"Test Local Rural — {test_lb.name}",
            description="Focused voting test for one rural municipality",
            election_type="LOCAL_RURAL",
            government_level="LOCAL",
            election_subtype="LOCAL_RURAL",
            status="POLLING_CLOSED",
            start_time=now - timedelta(hours=12),
            end_time=now - timedelta(hours=1),
            polling_start_at=now - timedelta(hours=12),
            polling_end_at=now - timedelta(hours=1),
            created_by=admin_id,
        )
        db.add(focus_election)
        db.flush()
        election_ids.append(focus_election.id)
        focus_eid = focus_election.id
        print(f"  Focus election id={focus_eid}")

        # ── Manually create contests for just this one body ─────
        print("\n[5] Creating contest structure for focused test...")

        # Head contests
        chair_contest = ElectionContest(
            election_id=focus_eid,
            contest_type=CONTEST_TYPE_MAYOR,
            title=f"Chairperson – {test_lb.name}",
            seat_count=1,
            area_id=test_lb.id,
        )
        vice_chair_contest = ElectionContest(
            election_id=focus_eid,
            contest_type=CONTEST_TYPE_DEPUTY_MAYOR,
            title=f"Vice Chairperson – {test_lb.name}",
            seat_count=1,
            area_id=test_lb.id,
        )
        db.add(chair_contest)
        db.add(vice_chair_contest)
        db.flush()

        # Ward contests (4 per ward)
        ward_contests = {}  # ward_code → {type: contest}
        for ward in test_wards:
            wc = {}
            for ct, title_prefix in [
                (CONTEST_TYPE_WARD_CHAIR, "Ward Chairperson"),
                (CONTEST_TYPE_WARD_WOMAN_MEMBER, "Woman Ward Member"),
                (CONTEST_TYPE_WARD_DALIT_WOMAN_MEMBER, "Dalit Woman Ward Member"),
                (CONTEST_TYPE_WARD_MEMBER_OPEN, "Open Ward Member"),
            ]:
                sc = 2 if ct == CONTEST_TYPE_WARD_MEMBER_OPEN else 1
                c = ElectionContest(
                    election_id=focus_eid,
                    contest_type=ct,
                    title=f"{title_prefix} – {ward.name}",
                    seat_count=sc,
                    area_id=ward.id,
                )
                db.add(c)
                wc[ct] = c
            ward_contests[ward.code] = wc

        db.flush()

        total_contests = 2 + (4 * num_wards)
        actual_count = db.execute(
            select(func.count()).select_from(ElectionContest)
            .where(ElectionContest.election_id == focus_eid)
        ).scalar_one()
        check(
            f"Focus contests = {total_contests}",
            actual_count == total_contests,
            f"got {actual_count}",
        )

        # ── Create parties ──────────────────────────────────────
        print("\n[6] Creating parties and candidates...")

        from app.models.party import Party
        parties = []
        for i in range(NUM_PARTIES):
            p = Party(
                name=f"Local Test Party {chr(65+i)}",
                abbreviation=f"LTP{chr(65+i)}",
            )
            db.add(p)
            parties.append(p)
        db.flush()
        party_ids = [p.id for p in parties]

        # ── Create candidates and nominations for ALL contests ──
        # Head contests: 3 candidates each
        all_nominations = {}  # contest_id → [nomination, ...]

        for contest in [chair_contest, vice_chair_contest]:
            noms = []
            for party in parties:
                cp = CandidateProfile(
                    full_name=f"Cand-{contest.contest_type}-{party.abbreviation}",
                    date_of_birth=datetime(1985, 1, 1),
                    gender="male" if party == parties[0] else "female",
                )
                db.add(cp)
                db.flush()
                candidate_ids.append(cp.id)
                nom = FptpCandidateNomination(
                    election_id=focus_eid,
                    contest_id=contest.id,
                    candidate_id=cp.id,
                    party_id=party.id,
                    status="APPROVED",
                )
                db.add(nom)
                noms.append(nom)
            db.flush()
            all_nominations[contest.id] = noms

        # Ward contests: 3 candidates each (4 candidates for OPEN so top-2 logic is tested)
        for ward_code, wcs in ward_contests.items():
            for ct, contest in wcs.items():
                num_cands = 4 if ct == CONTEST_TYPE_WARD_MEMBER_OPEN else NUM_PARTIES
                noms = []
                for ci in range(num_cands):
                    gender = "female"
                    if ct == CONTEST_TYPE_WARD_CHAIR:
                        gender = "male" if ci == 0 else "female"
                    cp = CandidateProfile(
                        full_name=f"Cand-{ward_code}-{ct}-{ci}",
                        date_of_birth=datetime(1990, 1, 1),
                        gender=gender,
                    )
                    db.add(cp)
                    db.flush()
                    candidate_ids.append(cp.id)
                    nom = FptpCandidateNomination(
                        election_id=focus_eid,
                        contest_id=contest.id,
                        candidate_id=cp.id,
                        party_id=parties[ci % NUM_PARTIES].id,
                        status="APPROVED",
                    )
                    db.add(nom)
                    noms.append(nom)
                db.flush()
                all_nominations[contest.id] = noms

        total_noms = sum(len(v) for v in all_nominations.values())
        print(f"  {total_noms} nominations across {len(all_nominations)} contests")

        # ════════════════════════════════════════════════════════
        # PHASE 5: Cast ballots
        # ════════════════════════════════════════════════════════
        print("\n[7] Casting encrypted ballots...")

        # Vote distribution per ward:
        #   Voters 0-4 → party A candidates (index 0)
        #   Voters 5-7 → party B candidates (index 1)
        #   Voters 8-9 → party C candidates (index 2)
        # For head contests: same distribution
        # For WARD_MEMBER_OPEN: voter picks top 2 (indices 0,1 or 1,2 or 0,2)

        expected_votes = defaultdict(lambda: defaultdict(int))  # contest_id → nom_id → count
        total_ballots = 0

        for wi, ward in enumerate(test_wards):
            wcs = ward_contests[ward.code]
            for vi in range(VOTERS_PER_WARD):
                salt = random.randint(100000, 999999)
                voter = User(
                    full_name=f"Local Voter {wi}-{vi}",
                    email=None,
                    hashed_password="$2b$12$test",
                    role="voter",
                    status="ACTIVE",
                    citizenship_no_raw=f"LV{salt}{wi}{vi}",
                    citizenship_no_normalized=f"lv{salt}{wi}{vi}",
                )
                db.add(voter)
                db.flush()
                user_ids.append(voter.id)

                # Party index for this voter
                if vi < 5:
                    party_idx = 0  # Party A
                elif vi < 8:
                    party_idx = 1  # Party B
                else:
                    party_idx = 2  # Party C

                ballot = Ballot(
                    election_id=focus_eid,
                    voter_id=voter.id,
                    area_id=ward.id,
                )
                db.add(ballot)
                db.flush()

                # ── Head contests (2 entries) ───────────────────
                for head_contest in [chair_contest, vice_chair_contest]:
                    noms = all_nominations[head_contest.id]
                    chosen = noms[party_idx]
                    expected_votes[head_contest.id][chosen.id] += 1

                    ct, nonce = _encrypt_choice({
                        "contest_id": head_contest.id,
                        "nomination_id": chosen.id,
                    })
                    db.add(BallotEntry(
                        ballot_id=ballot.id,
                        contest_id=head_contest.id,
                        ballot_type=head_contest.contest_type,
                        encrypted_choice=ct,
                        nonce=nonce,
                    ))

                # ── Ward contests (4 entries) ───────────────────
                for ct_type, contest in wcs.items():
                    noms = all_nominations[contest.id]

                    if ct_type == CONTEST_TYPE_WARD_MEMBER_OPEN:
                        # Pick 2 candidates: indices depend on voter group
                        if vi < 5:
                            picks = [noms[0].id, noms[1].id]  # A, B
                        elif vi < 8:
                            picks = [noms[1].id, noms[2].id]  # B, C
                        else:
                            picks = [noms[0].id, noms[3].id]  # A, D(party A)

                        for p in picks:
                            expected_votes[contest.id][p] += 1

                        ct_bytes, nonce = _encrypt_choice({
                            "contest_id": contest.id,
                            "nomination_ids": picks,
                        })
                        db.add(BallotEntry(
                            ballot_id=ballot.id,
                            contest_id=contest.id,
                            ballot_type=ct_type,
                            encrypted_choice=ct_bytes,
                            nonce=nonce,
                        ))
                    else:
                        chosen = noms[party_idx]
                        expected_votes[contest.id][chosen.id] += 1

                        ct_bytes, nonce = _encrypt_choice({
                            "contest_id": contest.id,
                            "nomination_id": chosen.id,
                        })
                        db.add(BallotEntry(
                            ballot_id=ballot.id,
                            contest_id=contest.id,
                            ballot_type=ct_type,
                            encrypted_choice=ct_bytes,
                            nonce=nonce,
                        ))

                total_ballots += 1

        db.flush()
        print(f"  {total_ballots} ballots cast ({num_wards} wards × {VOTERS_PER_WARD} voters)")

        # Expected vote patterns per contest:
        # Head/single-seat: A=5, B=3, C=2 → A wins
        # WARD_MEMBER_OPEN:
        #   nom[0](A): 5 (vi<5) + 2 (vi>=8) = 7
        #   nom[1](B): 5 (vi<5) + 3 (vi<8) = 8
        #   nom[2](C): 3 (vi<8) = 3
        #   nom[3](A): 2 (vi>=8) = 2
        #   → Top 2: nom[1]=8, nom[0]=7 → both win

        # ════════════════════════════════════════════════════════
        # PHASE 6: Execute count
        # ════════════════════════════════════════════════════════
        print("\n[8] Initiating and executing count...")

        count_run = initiate_count(db, focus_eid, admin_id)
        db.flush()
        check("Count run created", count_run is not None)
        check("Election status = COUNTING", focus_election.status == "COUNTING")

        count_run = execute_count(db, count_run.id)
        db.flush()
        check("Count status = COMPLETED", count_run.status == "COMPLETED")
        check(
            f"Ballots counted = {total_ballots}",
            count_run.total_ballots_counted == total_ballots,
            f"got {count_run.total_ballots_counted}",
        )
        check("No FPTP adjudication needed", count_run.total_fptp_adjudication == 0)
        check("No PR adjudication (local)", count_run.total_pr_adjudication == 0)

        # ════════════════════════════════════════════════════════
        # PHASE 7: Verify results
        # ════════════════════════════════════════════════════════
        print("\n[9] Verifying FPTP / local results...")

        fptp_rows = get_fptp_results(db, count_run.id)
        check("Result rows exist", len(fptp_rows) > 0, f"got {len(fptp_rows)}")

        # Check head contest results
        for head_contest in [chair_contest, vice_chair_contest]:
            rows = [r for r in fptp_rows if r.contest_id == head_contest.id]
            check(
                f"{head_contest.contest_type} has {NUM_PARTIES} rows",
                len(rows) == NUM_PARTIES,
                f"got {len(rows)}",
            )
            winners = [r for r in rows if r.is_winner]
            check(
                f"{head_contest.contest_type} has 1 winner",
                len(winners) == 1,
                f"got {len(winners)}",
            )
            if winners:
                check(
                    f"{head_contest.contest_type} winner has 5 votes",
                    winners[0].vote_count == 5 * num_wards,
                    f"got {winners[0].vote_count}",
                )

        # Check ward contest results for each ward
        ward_contests_checked = 0
        ward_open_checked = 0
        for ward_code, wcs in ward_contests.items():
            for ct_type, contest in wcs.items():
                rows = [r for r in fptp_rows if r.contest_id == contest.id]

                if ct_type == CONTEST_TYPE_WARD_MEMBER_OPEN:
                    # 4 candidates, top 2 win
                    check(
                        f"OPEN {ward_code}: 4 result rows",
                        len(rows) == 4,
                        f"got {len(rows)}",
                    )
                    winners = [r for r in rows if r.is_winner]
                    check(
                        f"OPEN {ward_code}: 2 winners",
                        len(winners) == 2,
                        f"got {len(winners)}",
                    )

                    # Verify vote counts
                    expected = expected_votes[contest.id]
                    for r in rows:
                        exp = expected.get(r.nomination_id, 0)
                        if r.vote_count != exp:
                            check(
                                f"OPEN {ward_code} nom {r.nomination_id} vote count",
                                False,
                                f"expected {exp}, got {r.vote_count}",
                            )
                    ward_open_checked += 1
                else:
                    # Single-seat contests
                    noms_count = NUM_PARTIES
                    check(
                        f"{ct_type} {ward_code}: {noms_count} rows",
                        len(rows) == noms_count,
                        f"got {len(rows)}",
                    )
                    winners = [r for r in rows if r.is_winner]
                    check(
                        f"{ct_type} {ward_code}: 1 winner",
                        len(winners) == 1,
                        f"got {len(winners)}",
                    )

                    # Winner should be Party A (5 votes)
                    if winners:
                        check(
                            f"{ct_type} {ward_code}: winner has 5 votes",
                            winners[0].vote_count == 5,
                            f"got {winners[0].vote_count}",
                        )
                    ward_contests_checked += 1

        print(f"  Checked {ward_contests_checked} single-seat ward contests, "
              f"{ward_open_checked} OPEN ward contests")

        # ════════════════════════════════════════════════════════
        # PHASE 8: Finalize
        # ════════════════════════════════════════════════════════
        print("\n[10] Finalizing count...")

        count_run = finalize_count(db, count_run.id)
        db.flush()
        check("Count is_final = True", count_run.is_final is True)
        check("Count is_locked = True", count_run.is_locked is True)
        check("Election status = FINALIZED", focus_election.status == "FINALIZED")

        # ════════════════════════════════════════════════════════
        # PHASE 9: Immutability
        # ════════════════════════════════════════════════════════
        print("\n[11] Testing immutability...")

        try:
            execute_count(db, count_run.id)
            check("Re-execution blocked", False, "should have raised")
        except CountServiceError:
            check("Re-execution blocked", True)

        try:
            finalize_count(db, count_run.id)
            check("Re-finalization blocked", False, "should have raised")
        except CountServiceError:
            check("Re-finalization blocked", True)

        # ════════════════════════════════════════════════════════
        # PHASE 10: Local result summary
        # ════════════════════════════════════════════════════════
        print("\n[12] Querying local result summary...")

        summary = get_local_result_summary(db, count_run.id)
        check("Summary has head_results", len(summary.get("head_results", [])) > 0)
        check("Summary has ward_results", len(summary.get("ward_results", [])) > 0)
        check(
            "Summary ward count matches",
            len(summary.get("ward_results", [])) == num_wards,
            f"got {len(summary.get('ward_results', []))}",
        )
        local_sum = summary.get("local_summary", {})
        check(
            "Summary total_seats > 0",
            local_sum.get("total_seats", 0) > 0,
            f"got {local_sum.get('total_seats', 0)}",
        )
        check(
            "Summary seats_filled > 0",
            local_sum.get("seats_filled", 0) > 0,
            f"got {local_sum.get('seats_filled', 0)}",
        )

        # ── Result summary (base) ──────────────────────────────
        base_summary = get_result_summary(db, count_run.id)
        check("Base summary is_final = True", base_summary["is_final"] is True)
        check("Base summary is_locked = True", base_summary["is_locked"] is True)

        # ════════════════════════════════════════════════════════
        print("\n" + "=" * 70)
        print(f"RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
        if failed == 0:
            print("ALL TESTS PASSED ✓")
        else:
            print(f"FAILURES: {failed}")
        print("=" * 70)

    except Exception as e:
        import traceback
        print(f"\nFATAL ERROR: {e}")
        traceback.print_exc()
        failed += 1

    finally:
        try:
            cleanup(db, election_ids, user_ids, party_ids, candidate_ids)
            print("Cleanup complete.")
        except Exception as ce:
            print(f"Cleanup error: {ce}")
        finally:
            db.close()


if __name__ == "__main__":
    run_test()
