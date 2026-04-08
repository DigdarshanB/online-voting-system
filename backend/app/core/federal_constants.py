"""Centralized constants for Federal House of Representatives elections.

All federal numeric and structural constants live here.
Do NOT scatter these numbers across routes, services, or UI code.
"""

# ── Seat counts ─────────────────────────────────────────────────
FEDERAL_HOR_TOTAL_SEATS = 275
FEDERAL_HOR_FPTP_SEATS = 165
FEDERAL_HOR_PR_SEATS = 110

# ── Contest structure ───────────────────────────────────────────
FEDERAL_HOR_FPTP_CONSTITUENCY_COUNT = 165  # one per FPTP seat
FEDERAL_HOR_PR_CONTEST_COUNT = 1           # single nationwide PR contest

# Each FPTP constituency elects exactly 1 winner
FPTP_SEATS_PER_CONSTITUENCY = 1

# ── PR rules ────────────────────────────────────────────────────
PR_THRESHOLD_FRACTION = "0.03"  # 3 % — stored as string for Decimal use

# ── Contest types ───────────────────────────────────────────────
CONTEST_TYPE_FPTP = "FPTP"
CONTEST_TYPE_PR = "PR"
