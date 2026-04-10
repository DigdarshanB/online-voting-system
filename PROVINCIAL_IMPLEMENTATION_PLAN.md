# Provincial Elections — Implementation Baseline & Plan

> Created: 2026-04-10 | Pre-implementation audit  
> This file is the living reference for safe phased provincial election work.

---

## 1. Source of Truth

**The root-repo file `Constituencies, Provinces and Municipalities.json`** is the
**only authoritative geography source**.

- It is an RTF-embedded JSON with 1 003 records.
- Clean extraction lives at `nepal_geography.json` (repo root).
- Both geography seed scripts (`seed_area_units.py`, `seed_constituencies.py`)
  read from `nepal_geography.json` first, falling back to the RTF file.

**No duplicate geography file may be created.** All province, constituency,
district, and municipality data must trace back to this single file.

### Geography hierarchy

| Category           | Count | Parent      | Code pattern    |
| ------------------ | ----: | ----------- | --------------- |
| COUNTRY            |     1 | –           | `NP`            |
| PROVINCE           |     7 | `NP`        | `P1`–`P7`       |
| DISTRICT           |    77 | `P1`–`P7`   | `D01`–`D77`     |
| CONSTITUENCY       |   165 | `D01`–`D77` | `FC001`–`FC165` |
| MUNICIPALITY       |   270 | `D01`–`D77` | `LB####`        |
| RURAL_MUNICIPALITY |   466 | `D01`–`D77` | `LB####`        |
| METROPOLITAN       |     6 | `D##`       | `LB####`        |
| SUB_METROPOLITAN   |    11 | `D##`       | `LB####`        |

### Key fact: no separate provincial constituency category exists

The 165 CONSTITUENCY entries are **federal HoR**. Nepal's Provincial Assembly
elections reuse the same 165 constituency boundaries. There is no
`PROVINCIAL_CONSTITUENCY` category in the source file and no plan to invent one.

Provincial FPTP contests → the existing CONSTITUENCY area_units, filtered by
`province_number`.

Constituency counts per province:  
P1 = 28, P2 = 32, P3 = 33, P4 = 18, P5 = 26, P6 = 12, P7 = 16 → Total = 165.

---

## 2. Protected Federal Baseline

The following functionality is **complete and must not be broken**:

| Subsystem                               | Key files                                                                                                                              | Status                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Election CRUD + lifecycle               | `election_service.py`, `admin_elections.py`, `ManageElectionsPage.jsx`, `ManageElectionsHubPage.jsx`, `ManageFederalElectionsPage.jsx` | Complete                |
| Federal structure gen (165 FPTP + 1 PR) | `election_service.py:_generate_federal_hor()`                                                                                          | Complete                |
| Federal readiness checks                | `election_service.py:_check_federal_hor_readiness()`                                                                                   | Complete                |
| Candidate profiles + party registry     | `candidate_service.py`, `party_service.py`, `ManageCandidatesPage.jsx`                                                                 | Complete                |
| FPTP nominations                        | `candidate_service.py:create_fptp_nomination()`, `ManageFederalCandidatesPage.jsx`                                                     | Complete                |
| PR submissions + list entries           | `pr_validation_service.py`, `ManageFederalCandidatesPage.jsx`                                                                          | Complete                |
| Voter assignment (federal constituency) | `admin_voter_assignments.py`, `VoterAssignmentsPage.jsx`                                                                               | Complete                |
| Dual-ballot cast (FPTP + PR)            | `ballot_service.py:cast_dual_ballot()`                                                                                                 | Complete (federal only) |
| Voter election eligibility              | `ballot_service.py:_is_eligible_for_election()`                                                                                        | Complete (federal only) |
| Counting (FPTP tally + PR Sainte-Laguë) | `count_service.py`                                                                                                                     | Complete                |
| Results (admin + voter)                 | `admin_results.py`, `voter_results.py`, `ResultsPage.jsx`, `VoterResults.jsx`                                                          | Complete                |
| Auth, registration, verification        | auth_service, registration_service, verification_service                                                                               | Complete                |
| Dashboard                               | dashboard_service, DashboardPage                                                                                                       | Complete                |

---

## 3. Current Provincial State (Audit Snapshot)

### What already exists

| Item                                 | Status         | Notes                                                                                         |
| ------------------------------------ | -------------- | --------------------------------------------------------------------------------------------- |
| `Election.province_code` column      | ✅ Done        | VARCHAR(10), nullable, indexed. Migration `i0d1e2f3a4b5`.                                     |
| `ElectionCreate` schema validator    | ✅ Done        | PROVINCIAL requires `province_code` P1–P7; other levels reject it.                            |
| `_generate_provincial_assembly()`    | ✅ Done        | Creates N FPTP + 1 PR per province. Uses area_units CONSTITUENCY filtered by province_number. |
| `_check_provincial_readiness()`      | ✅ Done        | Validates FPTP count per province + PR seat_count > 0.                                        |
| `ManageProvincialElectionsPage.jsx`  | 🟡 Placeholder | Static capability cards, no CRUD.                                                             |
| `ManageProvincialCandidatesPage.jsx` | 🟡 Placeholder | Static capability cards, no CRUD.                                                             |

### What is NOT yet done (blockers for a working provincial election)

| Priority | Gap                                                                                                                                                                                                                                                                  | Affected files                                 | Impact                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| **P0**   | `Ballot.constituency_id` is NOT NULL FK → federal `constituencies` table. No `area_id` column.                                                                                                                                                                       | `ballot.py`                                    | Cannot store provincial ballots at all.                             |
| **P0**   | `ballot_service.py` — all three core functions (`_is_eligible_for_election`, `get_ballot_info`, `cast_dual_ballot`) are hardwired to federal `constituency_id`. Provincial elections pass eligibility to everyone and cannot locate the correct provincial contests. | `ballot_service.py`                            | Provincial voting is non-functional.                                |
| **P0**   | `PrPartySubmission` has no `contest_id` — unique constraint `(election_id, party_id)` means one list per election, not per provincial PR contest.                                                                                                                    | `pr_party_submission.py`                       | Cannot submit separate provincial PR lists.                         |
| **P0**   | `PrResultRow` has no `contest_id` — PR results are election-scoped, not contest-scoped.                                                                                                                                                                              | `pr_result_row.py`                             | Cannot store per-province PR tallies.                               |
| **P1**   | `VoterConstituencyAssignment` — one assignment per voter to federal constituency only. No per-election or per-level scoping, no `area_id`.                                                                                                                           | `voter_constituency_assignment.py`             | No mechanism to assign voters to provincial elections.              |
| **P1**   | `count_service.py` — `PR_THRESHOLD_FRACTION` is a single global 3%. If provincial PR uses a different threshold, needs per-election override.                                                                                                                        | `count_service.py`, `federal_constants.py`     | May silently apply wrong threshold.                                 |
| **P1**   | `count_service.py` / `pr_validation_service.py` — fallback `FEDERAL_HOR_PR_SEATS = 110` activates when PR `seat_count == 0`. Provincial PR contests start at seat_count=0.                                                                                           | `count_service.py`, `pr_validation_service.py` | Silently uses 110 seats for provincial PR.                          |
| **P2**   | `election_constants.py` — `PROVINCIAL_ASSEMBLY` ContestDef is a dead placeholder (generator ignores it).                                                                                                                                                             | `election_constants.py`                        | Confusing code; no functional impact since generator already works. |
| **P2**   | No provincial constants file (per-province PR seat counts, thresholds).                                                                                                                                                                                              | New file needed                                | Missing configuration.                                              |
| **P2**   | Result display — `ResultsPage.jsx` and `VoterResults.jsx` have no government-level awareness.                                                                                                                                                                        | `ResultsPage.jsx`, `VoterResults.jsx`          | Would show federal and provincial results identically.              |
| **P3**   | PR elected members are not persisted — computed in memory.                                                                                                                                                                                                           | `count_service.py`                             | Not a blocker but limits querying.                                  |
| **P3**   | `PrResultRow` and `FptpResultRow` lack uniqueness constraints.                                                                                                                                                                                                       | `pr_result_row.py`, `fptp_result_row.py`       | Duplicate result rows theoretically possible.                       |

---

## 4. Modules Likely to Change in Provincial Phases

### Schema changes (migration required)

| Model                         | Change                                                                                 | Phase   |
| ----------------------------- | -------------------------------------------------------------------------------------- | ------- |
| `Ballot`                      | Add `area_id` FK or make `constituency_id` nullable + add `area_id`                    | Phase A |
| `PrPartySubmission`           | Add `contest_id` FK; change unique constraint to `(election_id, party_id, contest_id)` | Phase A |
| `PrResultRow`                 | Add `contest_id` FK                                                                    | Phase A |
| `VoterConstituencyAssignment` | Add `area_id` FK or create new `voter_area_assignment` table                           | Phase B |

### Service changes (no migration)

| File                       | Change                                                                             | Phase   |
| -------------------------- | ---------------------------------------------------------------------------------- | ------- |
| `ballot_service.py`        | Branch all three core functions by government_level; use area_id for provincial    | Phase B |
| `count_service.py`         | Make threshold per-election configurable; remove 110-seat fallback                 | Phase B |
| `pr_validation_service.py` | Remove FEDERAL_HOR_PR_SEATS fallback; fail if seat_count == 0                      | Phase A |
| `election_constants.py`    | Fix or remove stale PROVINCIAL_ASSEMBLY ContestDef                                 | Phase A |
| `election_service.py`      | Already done for structure gen; may need provincial PR seat configuration endpoint | Phase A |

### Frontend changes

| File                                 | Change                                                    | Phase   |
| ------------------------------------ | --------------------------------------------------------- | ------- |
| `ManageProvincialElectionsPage.jsx`  | Replace placeholder with real provincial election CRUD    | Phase C |
| `ManageProvincialCandidatesPage.jsx` | Replace placeholder with nominations + PR list management | Phase C |
| `ResultsPage.jsx`                    | Add government_level tabs or province grouping            | Phase D |
| `VoterElections.jsx`                 | Add province/level grouping for voter election list       | Phase D |
| `VoterBallot.jsx`                    | Support provincial ballot structure                       | Phase D |
| `VoterResults.jsx`                   | Display provincial PR results per province                | Phase D |

---

## 5. Safe Phase Order

**Phase A — Schema Preparation** (no behavior changes)

- Add `contest_id` to `PrPartySubmission` + `PrResultRow` (nullable, additive)
- Add `area_id` to `Ballot` (nullable, additive)
- Clean up `election_constants.py` PROVINCIAL_ASSEMBLY placeholder
- Fix 110-seat fallback in `pr_validation_service.py` / `count_service.py`
- Create `provincial_constants.py` with per-province PR seat counts

**Phase B — Backend Logic** (provincial service code)

- Implement provincial voter eligibility in `ballot_service.py`
- Implement provincial ballot retrieval and casting in `ballot_service.py`
- Implement provincial PR submission scoped to contest
- Implement provincial counting with per-contest PR
- Add voter area/province assignment mechanism

**Phase C — Admin Frontend** (provincial admin pages)

- Build real ManageProvincialElectionsPage (reuse federal patterns)
- Build real ManageProvincialCandidatesPage (reuse federal patterns)
- Add provincial voter assignment UI

**Phase D — Voter Frontend & Results** (voter-facing changes)

- Provincial election display and ballot UI
- Provincial results display
- Level-aware filtering and grouping

---

## 6. Rules for All Provincial Work

1. **Do not modify federal flows.** All federal paths must remain bit-identical.
2. **Additive schema changes only.** Nullable columns, new tables, new constraints.
   Never drop or rename existing columns.
3. **No duplicate geography source.** All data traces to
   `Constituencies, Provinces and Municipalities.json` → `nepal_geography.json`.
4. **No hidden files or hidden folders.**
5. **No speculative local-election changes.** Provincial work should be
   compatible with future local phases but must not implement them.
6. **Provincial elections are ONE ELECTION PER PROVINCE.** A provincial
   election is scoped by `Election.province_code`.
7. **PR seat counts are per-province.** They must be configurable per
   provincial PR contest, not hardcoded.
8. **Stop at phase boundary.** Do not continue into the next phase without
   explicit instruction.
