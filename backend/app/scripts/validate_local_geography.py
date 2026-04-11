"""Validate local election geography data.

Checks:
1. Local body counts (urban vs rural)
2. Ward data availability and integrity
3. Parent-child linkage (ward → local body → district → province)
4. Province consistency for all local bodies and wards
5. Ward number continuity within each local body
6. Cross-reference seeded area_units against source files

Run:  python -m app.scripts.validate_local_geography
"""

from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.geography_loader import (
    LOCAL_BODY_CATEGORIES,
    URBAN_LOCAL_BODY_CATEGORIES,
    RURAL_LOCAL_BODY_CATEGORIES,
    EXPECTED_TOTAL_LOCAL_BODIES,
    EXPECTED_URBAN_LOCAL_BODIES,
    EXPECTED_RURAL_LOCAL_BODIES,
    EXPECTED_WARD_COUNT,
    ward_data_available,
    validate_ward_data,
    validate_source,
)
from app.db.session import SessionLocal
from app.models.area_unit import AreaUnit


def validate(verbose: bool = True) -> list[str]:
    """Run all local geography validations.

    Returns a list of issue strings. Empty list = PASS.
    """
    issues: list[str] = []

    # ── 1. Validate base geography source file ──────────────────
    if verbose:
        print("=== Source file validation ===")
    source_issues = validate_source()
    if source_issues:
        issues.extend(source_issues)
        if verbose:
            for s in source_issues:
                print(f"  FAIL: {s}")
    elif verbose:
        print("  PASS: Base geography source is clean.")

    # ── 2. Validate ward data file (if present) ────────────────
    if verbose:
        print("\n=== Ward data validation ===")
    if not ward_data_available():
        msg = (
            "Ward data file (nepal_ward_data.json) not present. "
            "Local elections cannot generate ward-level contests."
        )
        issues.append(msg)
        if verbose:
            print(f"  WARN: {msg}")
    else:
        ward_issues = validate_ward_data()
        if ward_issues:
            issues.extend(ward_issues)
            if verbose:
                for w in ward_issues:
                    print(f"  FAIL: {w}")
        elif verbose:
            print("  PASS: Ward data file validates successfully.")

    # ── 3. Validate seeded area_units in DB ────────────────────
    if verbose:
        print("\n=== Database area_units validation ===")
    db = SessionLocal()
    try:
        db_issues = _validate_db_area_units(db, verbose)
        issues.extend(db_issues)
    finally:
        db.close()

    # ── Summary ─────────────────────────────────────────────────
    if verbose:
        print(f"\n{'='*50}")
        if issues:
            print(f"RESULT: FAIL — {len(issues)} issue(s) found")
        else:
            print("RESULT: PASS — all checks passed")

    return issues


def _validate_db_area_units(db: Session, verbose: bool) -> list[str]:
    """Validate area_units rows in the database."""
    issues: list[str] = []

    # Category counts
    counts_rows = db.execute(
        select(AreaUnit.category, func.count(AreaUnit.id))
        .group_by(AreaUnit.category)
    ).all()
    counts = {cat: cnt for cat, cnt in counts_rows}

    if verbose:
        for cat, cnt in sorted(counts.items()):
            print(f"  {cat}: {cnt}")

    # ── 3a. Local body counts ──────────────────────────────────
    urban = sum(counts.get(c, 0) for c in URBAN_LOCAL_BODY_CATEGORIES)
    rural = sum(counts.get(c, 0) for c in RURAL_LOCAL_BODY_CATEGORIES)
    total_local = urban + rural

    if total_local != EXPECTED_TOTAL_LOCAL_BODIES:
        issues.append(
            f"Total local bodies: expected {EXPECTED_TOTAL_LOCAL_BODIES}, got {total_local}"
        )
    if urban != EXPECTED_URBAN_LOCAL_BODIES:
        issues.append(
            f"Urban local bodies: expected {EXPECTED_URBAN_LOCAL_BODIES}, got {urban}"
        )
    if rural != EXPECTED_RURAL_LOCAL_BODIES:
        issues.append(
            f"Rural local bodies: expected {EXPECTED_RURAL_LOCAL_BODIES}, got {rural}"
        )

    if verbose and not any("local bodies" in i for i in issues):
        print(f"  Local bodies: {total_local} (urban={urban}, rural={rural}) — OK")

    # ── 3b. Ward counts ─────────────────────────────────────────
    ward_count = counts.get("WARD", 0)
    if ward_count == 0 and verbose:
        print("  Wards: 0 (no ward data seeded)")
    elif ward_count > 0:
        if ward_count != EXPECTED_WARD_COUNT:
            issues.append(
                f"Ward count: expected {EXPECTED_WARD_COUNT}, got {ward_count}"
            )
        elif verbose:
            print(f"  Wards: {ward_count} — OK")

    # ── 3c. Parent-child integrity ──────────────────────────────
    all_units = list(db.execute(select(AreaUnit)).scalars().all())
    code_to_unit = {u.code: u for u in all_units}

    orphan_count = 0
    for u in all_units:
        if u.parent_code is not None and u.parent_code not in code_to_unit:
            orphan_count += 1
            if orphan_count <= 5:
                issues.append(
                    f"Orphan: {u.code} ({u.category}) references "
                    f"non-existent parent {u.parent_code}"
                )
    if orphan_count > 5:
        issues.append(f"... and {orphan_count - 5} more orphan records")
    elif verbose and orphan_count == 0:
        print("  Parent-child integrity: OK")

    # ── 3d. Local body → district → province chain ─────────────
    local_no_province = 0
    for u in all_units:
        if u.category in LOCAL_BODY_CATEGORIES and u.province_number is None:
            local_no_province += 1
    if local_no_province > 0:
        issues.append(
            f"{local_no_province} local bodies have province_number=NULL"
        )
    elif verbose:
        print("  Province assignment on local bodies: OK")

    # ── 3e. Ward parent is a local body ─────────────────────────
    wards = [u for u in all_units if u.category == "WARD"]
    bad_ward_parent = 0
    for w in wards:
        parent = code_to_unit.get(w.parent_code)
        if parent is None or parent.category not in LOCAL_BODY_CATEGORIES:
            bad_ward_parent += 1
            if bad_ward_parent <= 3:
                issues.append(
                    f"Ward {w.code} parent {w.parent_code} is not a local body"
                )
    if bad_ward_parent > 3:
        issues.append(f"... and {bad_ward_parent - 3} more ward parent issues")
    elif wards and verbose:
        print("  Ward-to-local-body linkage: OK")

    # ── 3f. Ward number continuity ──────────────────────────────
    wards_by_lb = defaultdict(list)
    for w in wards:
        wards_by_lb[w.parent_code].append(w.ward_number)

    gap_count = 0
    for lb_code, ward_nums in wards_by_lb.items():
        expected = list(range(1, len(ward_nums) + 1))
        if sorted(ward_nums) != expected:
            gap_count += 1
            if gap_count <= 3:
                issues.append(
                    f"Ward numbering gap in {lb_code}: "
                    f"expected 1–{len(ward_nums)}, got {sorted(ward_nums)}"
                )
    if gap_count > 3:
        issues.append(f"... and {gap_count - 3} more numbering issues")
    elif wards and verbose:
        print("  Ward number continuity: OK")

    # ── 3g. Province consistency: wards inherit parent's province ─
    bad_prov_ward = 0
    for w in wards:
        parent = code_to_unit.get(w.parent_code)
        if parent and w.province_number != parent.province_number:
            bad_prov_ward += 1
    if bad_prov_ward > 0:
        issues.append(
            f"{bad_prov_ward} wards have province_number mismatch with parent local body"
        )
    elif wards and verbose:
        print("  Ward-province consistency: OK")

    return issues


if __name__ == "__main__":
    validate()
