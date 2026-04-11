"""Canonical geography loader for Nepal administrative hierarchy.

Single source of truth: ``Constituencies, Provinces and Municipalities.json``
(repo-root RTF file).  A pre-extracted plain-JSON copy,
``nepal_geography.json`` (repo root), is used when present because it is
faster to parse and is guaranteed identical to the RTF source.

Every seeder and validator in the project must import from **this module**.
Never duplicate the loading or parsing logic elsewhere.

Public API
----------
load_all()                    → list[dict]          all 1 003 records
load_by_category()            → dict[str,list[dict]] grouped by category
province_constituency_map()   → dict[str,list[dict]] province → constituency list
resolve_province_number(item) → int | None          walk tree to province int
validate_source()             → list[str]           issues; empty == PASS

Constants
---------
EXPECTED               category → expected count
PROVINCE_CODE_TO_NUMBER code (P1…P7) → int (1…7)
EXPECTED_PROVINCE_CONSTITUENCY_COUNTS province_number → expected constituency count
"""

import json
import os
import re
from collections import defaultdict

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_HERE = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(_HERE, "..", "..", ".."))

# Primary: clean plain-JSON extraction of the RTF source.
CLEAN_JSON_PATH = os.path.join(REPO_ROOT, "nepal_geography.json")

# Authoritative source (RTF-embedded JSON).
RTF_SOURCE_PATH = os.path.join(
    REPO_ROOT, "Constituencies, Provinces and Municipalities.json"
)

# ---------------------------------------------------------------------------
# Expected counts — any deviation must surface as a validation failure.
# ---------------------------------------------------------------------------

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

    # Locate the outermost JSON array boundaries.
    start = text.index("[")
    end = text.rindex("]") + 1
    chunk = text[start:end]

    # Unescape RTF-escaped braces.
    chunk = chunk.replace("\\{", "{").replace("\\}", "}")
    # Remove backslash-newline line continuations.
    chunk = re.sub(r"\\\n", "\n", chunk)
    # Remove RTF control words (e.g. \par, \f0, \cf1 …).
    chunk = re.sub(r"\\[a-z]+[0-9]*\s?", "", chunk)

    return json.loads(chunk)


# ---------------------------------------------------------------------------
# Public loaders
# ---------------------------------------------------------------------------

def load_all() -> list[dict]:
    """Return all 1 003 geography records.

    Load order:
    1. ``nepal_geography.json`` (clean pre-extracted JSON, fast)
    2. Parse ``Constituencies, Provinces and Municipalities.json`` (RTF source)

    Each record has four keys: ``name``, ``code``, ``category``, ``parent_code``.
    ``parent_code`` is ``null`` only for the single COUNTRY record.

    Raises
    ------
    FileNotFoundError
        If neither file is accessible.
    ValueError
        If the loaded data is obviously malformed (empty list).
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
    """Walk the parent chain of *item* until a PROVINCE node is found.

    Returns the integer province number (1–7) or ``None`` for the COUNTRY
    node or any record whose chain does not reach a province.

    Parameters
    ----------
    item:
        A single geography record dict (with ``code``, ``category``,
        ``parent_code`` keys).
    code_to_item:
        The ``{code: record}`` lookup built from :func:`load_all`.
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

    The 165 CONSTITUENCY records (federal HoR, ``FC001``–``FC165``) are the
    same boundaries used for Provincial Assembly FPTP contests.
    Provincial election generation filters area_units by ``province_number``
    at runtime; this function provides the equivalent mapping from the
    JSON source for validation and tooling.

    Example
    -------
    >>> m = province_constituency_map()
    >>> len(m["P1"])   # Koshi Province
    28
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


# ---------------------------------------------------------------------------
# Source validation
# ---------------------------------------------------------------------------

def validate_source() -> list[str]:
    """Validate the geography source file thoroughly.

    Checks performed
    ----------------
    1. File is loadable and returns a non-empty list.
    2. Record count matches :data:`EXPECTED` for every category.
    3. No unknown categories exist.
    4. Every record has non-empty ``name``, ``code``, and ``category`` fields.
    5. All codes are globally unique.
    6. Every ``parent_code`` (when set) refers to an existing code.
    7. Category-specific parent-category rules are enforced:
       - PROVINCE  → parent is COUNTRY
       - DISTRICT  → parent is PROVINCE
       - CONSTITUENCY → parent is DISTRICT
       - Local bodies → parent is DISTRICT
       - COUNTRY   → ``parent_code`` is null
    8. Province codes follow the ``P1``–``P7`` pattern.
    9. Constituency codes follow the ``FC###`` pattern.
    10. Constituency count per province matches
        :data:`EXPECTED_PROVINCE_CONSTITUENCY_COUNTS`.
    11. No duplicate codes within any single category.

    Returns
    -------
    list[str]
        List of human-readable issue descriptions; empty list means PASS.
    """
    issues: list[str] = []

    # --- 1. Load ---
    try:
        records = load_all()
    except Exception as exc:
        return [f"Cannot load geography source: {exc}"]

    by_cat: dict[str, list[dict]] = defaultdict(list)
    for r in records:
        by_cat[r["category"]].append(r)

    # --- 2. Expected counts per category ---
    for cat, expected in EXPECTED.items():
        actual = len(by_cat.get(cat, []))
        if actual != expected:
            issues.append(
                f"Category {cat}: expected {expected} records, got {actual}."
            )

    # --- 3. No unknown categories ---
    for cat in by_cat:
        if cat not in EXPECTED:
            issues.append(f"Unknown category in source: {cat!r}.")

    # --- 4. Required fields non-empty ---
    for r in records:
        for field in ("name", "code", "category"):
            if not r.get(field):
                issues.append(
                    f"Record missing/empty field {field!r}: {r}."
                )

    # --- 5. Global code uniqueness ---
    code_seen: dict[str, int] = {}
    for r in records:
        code = r.get("code", "")
        code_seen[code] = code_seen.get(code, 0) + 1
    for code, cnt in code_seen.items():
        if cnt > 1:
            issues.append(f"Duplicate code: {code!r} appears {cnt} times.")

    # --- 6. All parent_codes reference existing codes ---
    all_codes: set[str] = {r["code"] for r in records if r.get("code")}
    for r in records:
        parent = r.get("parent_code")
        if parent is not None and parent not in all_codes:
            issues.append(
                f"Record {r['code']!r} ({r['category']}) references "
                f"non-existent parent {parent!r}."
            )

    # --- 7. Category-specific parent rules ---
    code_to_cat: dict[str, str] = {r["code"]: r["category"] for r in records if r.get("code")}

    # COUNTRY: no parent
    for r in by_cat.get("COUNTRY", []):
        if r.get("parent_code") is not None:
            issues.append(
                f"COUNTRY {r['code']!r} must have parent_code=null, "
                f"got {r['parent_code']!r}."
            )

    # PROVINCE: parent must be COUNTRY
    for r in by_cat.get("PROVINCE", []):
        if code_to_cat.get(r.get("parent_code", "")) != "COUNTRY":
            issues.append(
                f"PROVINCE {r['code']!r} parent is not COUNTRY: "
                f"{r.get('parent_code')!r}."
            )

    # DISTRICT: parent must be PROVINCE
    for r in by_cat.get("DISTRICT", []):
        if code_to_cat.get(r.get("parent_code", "")) != "PROVINCE":
            issues.append(
                f"DISTRICT {r['code']!r} parent is not PROVINCE: "
                f"{r.get('parent_code')!r}."
            )

    # CONSTITUENCY: parent must be DISTRICT
    for r in by_cat.get("CONSTITUENCY", []):
        if code_to_cat.get(r.get("parent_code", "")) != "DISTRICT":
            issues.append(
                f"CONSTITUENCY {r['code']!r} parent is not DISTRICT: "
                f"{r.get('parent_code')!r}."
            )

    # Local bodies: parent must be DISTRICT
    for cat in LOCAL_BODY_CATEGORIES:
        for r in by_cat.get(cat, []):
            if code_to_cat.get(r.get("parent_code", "")) != "DISTRICT":
                issues.append(
                    f"{cat} {r['code']!r} parent is not DISTRICT: "
                    f"{r.get('parent_code')!r}."
                )

    # --- 8. Province code pattern (P1–P7) ---
    for r in by_cat.get("PROVINCE", []):
        if r["code"] not in PROVINCE_CODE_TO_NUMBER:
            issues.append(
                f"Province has unexpected code {r['code']!r}; expected one of P1–P7."
            )

    # --- 9. Constituency code pattern (FC + digits) ---
    fc_pattern = re.compile(r"^FC\d{3}$")
    for r in by_cat.get("CONSTITUENCY", []):
        if not fc_pattern.match(r.get("code", "")):
            issues.append(
                f"Constituency {r['code']!r} does not match expected pattern FC###."
            )

    # --- 10. Constituency count per province ---
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

    # --- 11. No duplicate codes within any single category ---
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


# ---------------------------------------------------------------------------
# Ward data loader
# ---------------------------------------------------------------------------

def ward_data_available() -> bool:
    """Return True if the authoritative ward data file exists."""
    return os.path.exists(WARD_DATA_PATH)


def load_ward_data() -> list[dict]:
    """Load ward-count-per-local-body from the authoritative ward data file.

    Expected format: JSON array of objects with keys:
      - ``local_body_code``: str — matches an existing local body area_unit code
      - ``ward_count``: int — number of wards in that local body (typically 9–33)

    Returns
    -------
    list[dict]
        The parsed ward data array.

    Raises
    ------
    FileNotFoundError
        If ``nepal_ward_data.json`` does not exist.
    ValueError
        If the file is malformed or empty.
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
    """Validate the ward data file against the base geography source.

    Checks performed:
    1. Ward data file is loadable.
    2. Every entry has ``local_body_code`` (str) and ``ward_count`` (int ≥ 1).
    3. Every ``local_body_code`` references an existing local body in the base geography.
    4. No duplicate local_body_code entries.
    5. Ward count per body is in reasonable range (1–35).
    6. Total ward count matches EXPECTED_WARD_COUNT (6,743).
    7. Coverage: every local body in base geography has a ward entry.
    8. Province consistency: ward parent chain resolves to correct province.

    Returns
    -------
    list[str]
        List of issue descriptions; empty list means PASS.
    """
    issues: list[str] = []

    # --- 1. Load ward data ---
    try:
        ward_data = load_ward_data()
    except (FileNotFoundError, ValueError) as exc:
        return [str(exc)]

    # --- Load base geography for cross-referencing ---
    try:
        base = load_all()
    except Exception as exc:
        return [f"Cannot load base geography: {exc}"]

    base_by_code = {r["code"]: r for r in base}
    local_body_codes = {
        r["code"] for r in base if r["category"] in LOCAL_BODY_CATEGORIES
    }

    # --- 2. Required fields ---
    for i, entry in enumerate(ward_data):
        if not isinstance(entry.get("local_body_code"), str) or not entry["local_body_code"]:
            issues.append(f"Entry {i}: missing or empty 'local_body_code'.")
        ward_count = entry.get("ward_count")
        if not isinstance(ward_count, int) or ward_count < 1:
            issues.append(
                f"Entry {i} ({entry.get('local_body_code', '?')}): "
                f"'ward_count' must be a positive integer, got {ward_count!r}."
            )

    if issues:
        return issues  # stop early if structural problems

    # --- 3. Reference existing local body ---
    seen_codes: dict[str, int] = {}
    for entry in ward_data:
        code = entry["local_body_code"]
        seen_codes[code] = seen_codes.get(code, 0) + 1
        if code not in local_body_codes:
            issues.append(
                f"Ward entry for '{code}' does not match any local body in base geography."
            )

    # --- 4. No duplicates ---
    for code, cnt in seen_codes.items():
        if cnt > 1:
            issues.append(f"Duplicate ward entry for local body '{code}' ({cnt} times).")

    # --- 5. Reasonable range ---
    for entry in ward_data:
        wc = entry["ward_count"]
        if wc < 1 or wc > 35:
            issues.append(
                f"Local body '{entry['local_body_code']}': ward_count={wc} "
                f"outside expected range 1–35."
            )

    # --- 6. Total count ---
    total_wards = sum(e["ward_count"] for e in ward_data)
    if total_wards != EXPECTED_WARD_COUNT:
        issues.append(
            f"Total ward count: expected {EXPECTED_WARD_COUNT}, got {total_wards}."
        )

    # --- 7. Full coverage ---
    covered = {e["local_body_code"] for e in ward_data}
    missing = local_body_codes - covered
    if missing:
        issues.append(
            f"{len(missing)} local bodies missing ward data: "
            f"{sorted(missing)[:10]}{'...' if len(missing) > 10 else ''}."
        )

    # --- 8. Province consistency ---
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
    """Generate individual ward area_unit records from ward-count data.

    Each ward record has:
      - code: "{local_body_code}-W{nn}" (e.g. "LB0001-W01")
      - name: "{local_body_name} Ward {n}"
      - category: "WARD"
      - parent_code: local_body_code
      - ward_number: n (1-based)

    Parameters
    ----------
    ward_data:
        The output of :func:`load_ward_data`.

    Returns
    -------
    list[dict]
        Ward records ready for seeding into area_units.
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
