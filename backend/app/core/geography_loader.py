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
