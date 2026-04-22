"""Canonical geography loader for the Nepal administrative hierarchy.

Single source of truth: the repo-root RTF file ``Constituencies, Provinces
and Municipalities.json``. A pre-extracted ``nepal_geography.json`` is used
when present because parsing the RTF is slow.

All seeders and validators must import from this module rather than
duplicating the parsing logic.
"""

import json
import os
import re
from collections import defaultdict

_HERE = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))

# Fast path: pre-extracted JSON copy of the RTF source.
CLEAN_JSON_PATH = os.path.join(REPO_ROOT, "nepal_geography.json")

# Authoritative source: RTF file with embedded JSON.
RTF_SOURCE_PATH = os.path.join(
    REPO_ROOT, "Constituencies, Provinces and Municipalities.json"
)

# Any deviation from these counts must surface as a validation failure.
EXPECTED: dict[str, int] = {
    "COUNTRY": 1,
    "PROVINCE": 7,
    "DISTRICT": 77,
    "CONSTITUENCY": 165,
    "MUNICIPALITY": 270,
    "RURAL_MUNICIPALITY": 466,
    "METROPOLITAN": 6,
    "SUB_METROPOLITAN": 11,
}

# Ward records are loaded from a separate ward data file, not the base JSON.
# EXPECTED_WARD_COUNT is set once ward data has been imported.
EXPECTED_WARD_COUNT: int = 6_743

PROVINCE_CODE_TO_NUMBER: dict[str, int] = {
    "P1": 1, "P2": 2, "P3": 3,
    "P4": 4, "P5": 5, "P6": 6, "P7": 7,
}

# Federal HoR constituencies per province (reused for Provincial Assembly FPTP).
# Source: canonical RTF file, verified by validate_source().
EXPECTED_PROVINCE_CONSTITUENCY_COUNTS: dict[int, int] = {
    1: 28, 2: 32, 3: 33, 4: 18, 5: 26, 6: 12, 7: 16,
}

# Categories that are "local body" nodes (direct children of DISTRICT).
LOCAL_BODY_CATEGORIES = frozenset({
    "MUNICIPALITY",
    "RURAL_MUNICIPALITY",
    "METROPOLITAN",
    "SUB_METROPOLITAN",
})

# Urban local bodies (elect Mayor + Deputy Mayor).
URBAN_LOCAL_BODY_CATEGORIES = frozenset({
    "MUNICIPALITY",
    "METROPOLITAN",
    "SUB_METROPOLITAN",
})

# Rural local bodies (elect Chairperson + Vice Chairperson).
RURAL_LOCAL_BODY_CATEGORIES = frozenset({
    "RURAL_MUNICIPALITY",
})

# Expected local body counts by classification
EXPECTED_URBAN_LOCAL_BODIES: int = 270 + 6 + 11  # 287
EXPECTED_RURAL_LOCAL_BODIES: int = 466
EXPECTED_TOTAL_LOCAL_BODIES: int = EXPECTED_URBAN_LOCAL_BODIES + EXPECTED_RURAL_LOCAL_BODIES  # 753

# ── Ward data ─────────────────────────────────────────────────
# Ward data is stored separately from the base geography JSON because
# it must be sourced from an authoritative election commission file.
# The file must be: repo_root/nepal_ward_data.json
# Format: [{"local_body_code": "LB0001", "ward_count": 9}, ...]
# Until this file exists, ward-dependent operations fail safely.

WARD_DATA_PATH = os.path.join(REPO_ROOT, "nepal_ward_data.json")

# ---------------------------------------------------------------------------
# Internal RTF parser
# ---------------------------------------------------------------------------

def _parse_rtf_source(path: str) -> list[dict]:
    """Extract and parse the JSON array embedded inside the RTF source file.

    The RTF wrapper escapes ``{`` as ``\\{``, ``}`` as ``\\}``, and places
    backslash-newlines throughout.  This function strips those sequences and
    returns the parsed list of geography records.
    """
    with open(path, "rb") as fh:
        raw = fh.read()

    text = raw.decode("utf-8", errors="replace")

    # Outermost JSON array bounds inside the RTF wrapper.
    start = text.index("[")
    end = text.rindex("]") + 1
    chunk = text[start:end]

    chunk = chunk.replace("\\{", "{").replace("\\}", "}")
    chunk = re.sub(r"\\\n", "\n", chunk)
    # Drop RTF control words like \par, \f0, \cf1.
    chunk = re.sub(r"\\[a-z]+[0-9]*\s?", "", chunk)

    return json.loads(chunk)


def load_all() -> list[dict]:
    """Return all 1 003 geography records.

    Prefers the pre-extracted JSON file, falling back to parsing the RTF.
    Each record has ``name``, ``code``, ``category``, ``parent_code`` keys;
    only the COUNTRY record has a null parent.
    """
    if os.path.exists(CLEAN_JSON_PATH):
        with open(CLEAN_JSON_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    elif os.path.exists(RTF_SOURCE_PATH):
        data = _parse_rtf_source(RTF_SOURCE_PATH)
    else:
        raise FileNotFoundError(
            f"Geography source not found.\n"
            f"  Expected clean JSON at : {CLEAN_JSON_PATH}\n"
            f"  Expected RTF source at : {RTF_SOURCE_PATH}"
        )

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(
            f"Geography source loaded {len(data) if isinstance(data, list) else 'non-list'} records; "
            "expected 1003."
        )

    return data


def load_by_category() -> dict[str, list[dict]]:
    """Return all records grouped by their ``category`` field."""
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for record in load_all():
        by_cat[record["category"]].append(record)
    return dict(by_cat)


def resolve_province_number(item: dict, code_to_item: dict[str, dict]) -> int | None:
    """Walk the parent chain until a PROVINCE node is found.

    Returns the province number (1–7), or None for COUNTRY or any record
    whose chain does not reach a province.
    """
    category = item["category"]
    code = item["code"]

    if category == "COUNTRY":
        return None
    if category == "PROVINCE":
        return PROVINCE_CODE_TO_NUMBER.get(code)

    visited: set[str] = set()
    current = item
    while current:
        if current["code"] in visited:
            return None  # cycle guard
        visited.add(current["code"])
        parent_code = current.get("parent_code")
        if not parent_code:
            return None
        parent = code_to_item.get(parent_code)
        if parent is None:
            return None
        if parent["category"] == "PROVINCE":
            return PROVINCE_CODE_TO_NUMBER.get(parent["code"])
        current = parent

    return None


def province_constituency_map() -> dict[str, list[dict]]:
    """Return ``{province_code: [constituency_records]}`` for all 7 provinces.

    The 165 CONSTITUENCY records double as the Provincial Assembly FPTP
    boundaries. Provincial generation filters area_units by
    ``province_number`` at runtime; this is the equivalent mapping straight
    from the JSON source, used for validation and tooling.
    """
    by_cat = load_by_category()
    dist_to_province: dict[str, str] = {
        d["code"]: d["parent_code"] for d in by_cat.get("DISTRICT", [])
    }
    result: dict[str, list[dict]] = {f"P{i}": [] for i in range(1, 8)}
    for cst in by_cat.get("CONSTITUENCY", []):
        prov_code = dist_to_province.get(cst["parent_code"])
        if prov_code in result:
            result[prov_code].append(cst)
    return result


def validate_source() -> list[str]:
    """Run all source-file checks and return the list of issues (empty = PASS)."""
    issues: list[str] = []

    try:
        records = load_all()
    except Exception as exc:
        return [f"Cannot load geography source: {exc}"]

    by_cat: dict[str, list[dict]] = defaultdict(list)
    for r in records:
        by_cat[r["category"]].append(r)

    for cat, expected in EXPECTED.items():
        actual = len(by_cat.get(cat, []))
        if actual != expected:
            issues.append(
                f"Category {cat}: expected {expected} records, got {actual}."
            )

    for cat in by_cat:
        if cat not in EXPECTED:
            issues.append(f"Unknown category in source: {cat!r}.")

    for r in records:
        for field in ("name", "code", "category"):
            if not r.get(field):
                issues.append(
                    f"Record missing/empty field {field!r}: {r}."
                )

    code_seen: dict[str, int] = {}
    for r in records:
        code = r.get("code", "")
        code_seen[code] = code_seen.get(code, 0) + 1
    for code, cnt in code_seen.items():
        if cnt > 1:
            issues.append(f"Duplicate code: {code!r} appears {cnt} times.")

    all_codes: set[str] = {r["code"] for r in records if r.get("code")}
    for r in records:
        parent = r.get("parent_code")
        if parent is not None and parent not in all_codes:
            issues.append(
                f"Record {r['code']!r} ({r['category']}) references "
                f"non-existent parent {parent!r}."
            )

    # Parent-category rules: COUNTRY has no parent; PROVINCE→COUNTRY;
    # DISTRICT→PROVINCE; CONSTITUENCY and local bodies→DISTRICT.
    code_to_cat: dict[str, str] = {r["code"]: r["category"] for r in records if r.get("code")}

    for r in by_cat.get("COUNTRY", []):
        if r.get("parent_code") is not None:
            issues.append(
                f"COUNTRY {r['code']!r} must have parent_code=null, "
                f"got {r['parent_code']!r}."
            )

    for r in by_cat.get("PROVINCE", []):
        if code_to_cat.get(r.get("parent_code", "")) != "COUNTRY":
            issues.append(
                f"PROVINCE {r['code']!r} parent is not COUNTRY: "
                f"{r.get('parent_code')!r}."
            )

    for r in by_cat.get("DISTRICT", []):
        if code_to_cat.get(r.get("parent_code", "")) != "PROVINCE":
            issues.append(
                f"DISTRICT {r['code']!r} parent is not PROVINCE: "
                f"{r.get('parent_code')!r}."
            )

    for r in by_cat.get("CONSTITUENCY", []):
        if code_to_cat.get(r.get("parent_code", "")) != "DISTRICT":
            issues.append(
                f"CONSTITUENCY {r['code']!r} parent is not DISTRICT: "
                f"{r.get('parent_code')!r}."
            )

    for cat in LOCAL_BODY_CATEGORIES:
        for r in by_cat.get(cat, []):
            if code_to_cat.get(r.get("parent_code", "")) != "DISTRICT":
                issues.append(
                    f"{cat} {r['code']!r} parent is not DISTRICT: "
                    f"{r.get('parent_code')!r}."
                )

    for r in by_cat.get("PROVINCE", []):
        if r["code"] not in PROVINCE_CODE_TO_NUMBER:
            issues.append(
                f"Province has unexpected code {r['code']!r}; expected one of P1–P7."
            )

    fc_pattern = re.compile(r"^FC\d{3}$")
    for r in by_cat.get("CONSTITUENCY", []):
        if not fc_pattern.match(r.get("code", "")):
            issues.append(
                f"Constituency {r['code']!r} does not match expected pattern FC###."
            )

    # Per-province constituency totals.
    dist_to_prov: dict[str, str] = {
        d["code"]: d["parent_code"] for d in by_cat.get("DISTRICT", [])
    }
    prov_const_counts: dict[str, int] = defaultdict(int)
    for c in by_cat.get("CONSTITUENCY", []):
        prov_code = dist_to_prov.get(c.get("parent_code", ""))
        if prov_code:
            prov_const_counts[prov_code] += 1

    for prov_code, prov_num in PROVINCE_CODE_TO_NUMBER.items():
        expected_count = EXPECTED_PROVINCE_CONSTITUENCY_COUNTS[prov_num]
        actual_count = prov_const_counts.get(prov_code, 0)
        if actual_count != expected_count:
            issues.append(
                f"Province {prov_code} (number {prov_num}): expected "
                f"{expected_count} constituencies, got {actual_count}."
            )

    for cat, items in by_cat.items():
        cat_codes: dict[str, int] = {}
        for r in items:
            code = r.get("code", "")
            cat_codes[code] = cat_codes.get(code, 0) + 1
        for code, cnt in cat_codes.items():
            if cnt > 1:
                issues.append(
                    f"Duplicate code within category {cat}: {code!r} appears {cnt} times."
                )

    return issues


def ward_data_available() -> bool:
    return os.path.exists(WARD_DATA_PATH)


def load_ward_data() -> list[dict]:
    """Load the per-local-body ward counts.

    Expected format: ``[{"local_body_code": "LB0001", "ward_count": 9}, ...]``.
    """
    if not os.path.exists(WARD_DATA_PATH):
        raise FileNotFoundError(
            f"Ward data file not found at: {WARD_DATA_PATH}\n"
            "Local elections require authoritative ward data.\n"
            "Expected format: [{\"local_body_code\": \"LB0001\", \"ward_count\": 9}, ...]"
        )

    with open(WARD_DATA_PATH, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(
            f"Ward data file is empty or malformed. "
            f"Expected a non-empty JSON array, got {type(data).__name__}."
        )

    return data


def validate_ward_data() -> list[str]:
    """Validate the ward data file against the base geography (empty = PASS)."""
    issues: list[str] = []

    try:
        ward_data = load_ward_data()
    except (FileNotFoundError, ValueError) as exc:
        return [str(exc)]

    try:
        base = load_all()
    except Exception as exc:
        return [f"Cannot load base geography: {exc}"]

    base_by_code = {r["code"]: r for r in base}
    local_body_codes = {
        r["code"] for r in base if r["category"] in LOCAL_BODY_CATEGORIES
    }

    for i, entry in enumerate(ward_data):
        if not isinstance(entry.get("local_body_code"), str) or not entry["local_body_code"]:
            issues.append(f"Entry {i}: missing or empty 'local_body_code'.")
        ward_count = entry.get("ward_count")
        if not isinstance(ward_count, int) or ward_count < 1:
            issues.append(
                f"Entry {i} ({entry.get('local_body_code', '?')}): "
                f"'ward_count' must be a positive integer, got {ward_count!r}."
            )

    # Bail out early on structural problems so later checks don't crash.
    if issues:
        return issues

    seen_codes: dict[str, int] = {}
    for entry in ward_data:
        code = entry["local_body_code"]
        seen_codes[code] = seen_codes.get(code, 0) + 1
        if code not in local_body_codes:
            issues.append(
                f"Ward entry for '{code}' does not match any local body in base geography."
            )

    for code, cnt in seen_codes.items():
        if cnt > 1:
            issues.append(f"Duplicate ward entry for local body '{code}' ({cnt} times).")

    for entry in ward_data:
        wc = entry["ward_count"]
        if wc < 1 or wc > 35:
            issues.append(
                f"Local body '{entry['local_body_code']}': ward_count={wc} "
                f"outside expected range 1–35."
            )

    total_wards = sum(e["ward_count"] for e in ward_data)
    if total_wards != EXPECTED_WARD_COUNT:
        issues.append(
            f"Total ward count: expected {EXPECTED_WARD_COUNT}, got {total_wards}."
        )

    covered = {e["local_body_code"] for e in ward_data}
    missing = local_body_codes - covered
    if missing:
        issues.append(
            f"{len(missing)} local bodies missing ward data: "
            f"{sorted(missing)[:10]}{'...' if len(missing) > 10 else ''}."
        )

    code_to_item = {r["code"]: r for r in base}
    for entry in ward_data:
        lb = code_to_item.get(entry["local_body_code"])
        if lb:
            prov = resolve_province_number(lb, code_to_item)
            if prov is None:
                issues.append(
                    f"Local body '{entry['local_body_code']}' cannot resolve to a province."
                )

    return issues


def generate_ward_records(ward_data: list[dict]) -> list[dict]:
    """Expand ward-count entries into individual ward area_unit records.

    Each ward gets code ``"{local_body_code}-W{nn}"`` and 1-based
    ``ward_number``.
    """
    base = load_all()
    code_to_name = {r["code"]: r["name"] for r in base}

    records = []
    for entry in ward_data:
        lb_code = entry["local_body_code"]
        lb_name = code_to_name.get(lb_code, lb_code)
        ward_count = entry["ward_count"]

        for w in range(1, ward_count + 1):
            records.append({
                "code": f"{lb_code}-W{w:02d}",
                "name": f"{lb_name} Ward {w}",
                "category": "WARD",
                "parent_code": lb_code,
                "ward_number": w,
            })

    return records
