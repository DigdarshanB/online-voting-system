"""Provincial Assembly election constants.

Nepal's Provincial Assemblies have FPTP + PR seats.
Per the Constitution of Nepal (Article 176), each province has
Provincial Assembly seats equal to double the number of federal
FPTP constituencies in that province: N FPTP + N PR = 2N total.

Source for constituency-per-province counts:
  Verified from the canonical geography root file
  ``Constituencies, Provinces and Municipalities.json``
"""

from app.core.geography_loader import EXPECTED_PROVINCE_CONSTITUENCY_COUNTS

# ── PR seats per province ───────────────────────────────────────
# Per the Constitution, PR seats = FPTP seats for each province.
# This dict is keyed by province_number (1–7).
PROVINCIAL_PR_SEATS: dict[int, int] = {
    prov_num: fptp_count
    for prov_num, fptp_count in EXPECTED_PROVINCE_CONSTITUENCY_COUNTS.items()
}

# ── Total seats per province ────────────────────────────────────
PROVINCIAL_TOTAL_SEATS: dict[int, int] = {
    prov_num: fptp_count * 2
    for prov_num, fptp_count in EXPECTED_PROVINCE_CONSTITUENCY_COUNTS.items()
}

# ── Province codes for convenience ──────────────────────────────
PROVINCE_NUMBERS = tuple(sorted(EXPECTED_PROVINCE_CONSTITUENCY_COUNTS.keys()))

# ── PR threshold ────────────────────────────────────────────────
# Same 3% threshold as federal (Election Commission of Nepal rule).
PROVINCIAL_PR_THRESHOLD_FRACTION = "0.03"
