"""Geography validation for Nepal administrative hierarchy.

Validates the geography source file and the live database against the
canonical data provided by ``app.core.geography_loader``.

Checks covered
--------------
Source file
  - All 8 category counts match expected values
  - No unknown categories
  - All codes are non-empty, globally unique, and uniquely within category
  - All parent_codes reference existing codes
  - Category parent-chain rules (PROVINCE→COUNTRY, DISTRICT→PROVINCE, …)
  - Province code pattern (P1–P7)
  - Constituency code pattern (FC###)
  - Per-province constituency counts for provincial election readiness

Database — districts table
  - Expected count (77)
  - Every JSON district present with correct name and province_number
  - No extra districts not in JSON source

Database — constituencies table
  - Expected count (165)
  - Every JSON constituency present with correct name and parent district

Database — area_units table
  - Total count (1 003)
  - Counts per category match expected
  - Every JSON record present with correct name, category, parent_code
  - province_number populated for all non-COUNTRY/PROVINCE nodes that need it

Provincial coverage (for provincial election generation)
  - Each of the 7 provinces has the correct number of CONSTITUENCY area_units
  - Each is reachable via area_unit.province_number

Run:  python -m app.scripts.validate_geography
"""

from collections import defaultdict

from sqlalchemy import select, func, distinct

from app.core.geography_loader import (
    load_all,
    load_by_category,
    province_constituency_map,
    validate_source,
    EXPECTED,
    PROVINCE_CODE_TO_NUMBER,
    EXPECTED_PROVINCE_CONSTITUENCY_COUNTS,
)
from app.db.session import SessionLocal
from app.models.area_unit import AreaUnit
from app.models.district import District
from app.models.constituency import Constituency


# ---------------------------------------------------------------------------
# Source validation — thin wrapper that delegates to geography_loader
# ---------------------------------------------------------------------------

def validate_json_source() -> list[str]:
    """Run the comprehensive source-file validation from geography_loader.

    Returns a list of issue strings (empty = PASS).
    """
    return validate_source()


# ---------------------------------------------------------------------------
# Database — legacy districts/constituencies tables
# ---------------------------------------------------------------------------

def validate_database() -> list[str]:
    """Validate the districts and constituencies tables against the JSON source."""
    issues: list[str] = []
    db = SessionLocal()
    try:
        by_cat = load_by_category()
        json_districts = {d["code"]: d for d in by_cat.get("DISTRICT", [])}
        json_constituencies = {c["code"]: c for c in by_cat.get("CONSTITUENCY", [])}

        expected_districts = EXPECTED["DISTRICT"]
        expected_constituencies = EXPECTED["CONSTITUENCY"]

        # --- District count ---
        db_district_count = db.execute(
            select(func.count()).select_from(District)
        ).scalar_one()
        if db_district_count != expected_districts:
            issues.append(
                f"DB districts: expected {expected_districts}, got {db_district_count}."
            )

        # --- Constituency count ---
        db_const_count = db.execute(
            select(func.count()).select_from(Constituency)
        ).scalar_one()
        if db_const_count != expected_constituencies:
            issues.append(
                f"DB constituencies: expected {expected_constituencies}, got {db_const_count}."
            )

        # --- Validate each district ---
        db_districts = list(db.execute(select(District)).scalars().all())
        db_district_by_code: dict[str, District] = {}
        for d in db_districts:
            if d.code is None:
                issues.append(f"DB: district '{d.name}' (id={d.id}) has null code.")
                continue
            if d.code in db_district_by_code:
                issues.append(f"DB: duplicate district code {d.code!r}.")
            db_district_by_code[d.code] = d

            if d.code not in json_districts:
                issues.append(
                    f"DB: district {d.code!r} ('{d.name}') not in canonical source."
                )
            else:
                jd = json_districts[d.code]
                if d.name != jd["name"]:
                    issues.append(
                        f"DB: district {d.code} name mismatch — DB={d.name!r}, "
                        f"source={jd['name']!r}."
                    )
                expected_prov = PROVINCE_CODE_TO_NUMBER[jd["parent_code"]]
                if d.province_number != expected_prov:
                    issues.append(
                        f"DB: district {d.code} province_number mismatch — "
                        f"DB={d.province_number}, expected={expected_prov}."
                    )

        for code in json_districts:
            if code not in db_district_by_code:
                issues.append(
                    f"DB: missing district {json_districts[code]['name']!r} ({code})."
                )

        # --- Validate each constituency ---
        db_constituencies = list(db.execute(select(Constituency)).scalars().all())
        db_district_id_to_code = {d.id: d.code for d in db_districts}
        db_const_by_code: dict[str, Constituency] = {}

        for c in db_constituencies:
            if c.code is None:
                issues.append(
                    f"DB: constituency '{c.name}' (id={c.id}) has null code."
                )
                continue
            if c.code in db_const_by_code:
                issues.append(f"DB: duplicate constituency code {c.code!r}.")
            db_const_by_code[c.code] = c

            if c.code not in json_constituencies:
                issues.append(
                    f"DB: constituency {c.code!r} ('{c.name}') not in canonical source."
                )
            else:
                jc = json_constituencies[c.code]
                if c.name != jc["name"]:
                    issues.append(
                        f"DB: constituency {c.code} name mismatch — "
                        f"DB={c.name!r}, source={jc['name']!r}."
                    )
                expected_dist_code = jc["parent_code"]
                actual_dist_code = db_district_id_to_code.get(c.district_id)
                if actual_dist_code != expected_dist_code:
                    issues.append(
                        f"DB: constituency {c.code} district mismatch — "
                        f"DB district={actual_dist_code!r}, expected={expected_dist_code!r}."
                    )

        for code in json_constituencies:
            if code not in db_const_by_code:
                issues.append(
                    f"DB: missing constituency "
                    f"{json_constituencies[code]['name']!r} ({code})."
                )

        # --- Province constituency totals ---
        prov_totals: dict[int, int] = defaultdict(int)
        dist_id_to_prov = {d.id: d.province_number for d in db_districts}
        for c in db_constituencies:
            pn = dist_id_to_prov.get(c.district_id)
            if pn is not None:
                prov_totals[pn] += 1
        for prov_num, expected_count in EXPECTED_PROVINCE_CONSTITUENCY_COUNTS.items():
            actual = prov_totals.get(prov_num, 0)
            if actual != expected_count:
                issues.append(
                    f"DB: province {prov_num} has {actual} constituencies in "
                    f"constituencies table, expected {expected_count}."
                )

    finally:
        db.close()

    return issues


# ---------------------------------------------------------------------------
# Database — area_units table
# ---------------------------------------------------------------------------

def validate_area_units() -> list[str]:
    """Validate the area_units table against the JSON source.

    This is the primary geography store used by election generation.
    Every record in the JSON source must appear in area_units with
    matching name, category, parent_code, and correct province_number.
    """
    issues: list[str] = []
    db = SessionLocal()
    try:
        total_expected = sum(EXPECTED.values())  # 1003

        db_total = db.execute(
            select(func.count()).select_from(AreaUnit)
        ).scalar_one()

        if db_total == 0:
            issues.append(
                "area_units table is empty — run seed_area_units to populate it."
            )
            return issues

        if db_total != total_expected:
            issues.append(
                f"area_units: expected {total_expected} rows, got {db_total}."
            )

        # Category counts
        db_rows = list(db.execute(select(AreaUnit)).scalars().all())
        db_by_cat: dict[str, list[AreaUnit]] = defaultdict(list)
        for row in db_rows:
            db_by_cat[row.category].append(row)

        for cat, expected_count in EXPECTED.items():
            actual = len(db_by_cat.get(cat, []))
            if actual != expected_count:
                issues.append(
                    f"area_units[{cat}]: expected {expected_count}, got {actual}."
                )

        # Build DB lookup
        db_by_code: dict[str, AreaUnit] = {}
        for row in db_rows:
            if row.code in db_by_code:
                issues.append(f"area_units: duplicate code {row.code!r}.")
            db_by_code[row.code] = row

        # Compare against source
        all_records = load_all()
        code_to_item = {r["code"]: r for r in all_records}

        for src in all_records:
            code = src["code"]
            db_row = db_by_code.get(code)
            if db_row is None:
                issues.append(
                    f"area_units: missing record {code!r} "
                    f"({src['category']} — {src['name']!r})."
                )
                continue
            if db_row.name != src["name"]:
                issues.append(
                    f"area_units[{code}] name mismatch — "
                    f"DB={db_row.name!r}, source={src['name']!r}."
                )
            if db_row.category != src["category"]:
                issues.append(
                    f"area_units[{code}] category mismatch — "
                    f"DB={db_row.category!r}, source={src['category']!r}."
                )
            if db_row.parent_code != src.get("parent_code"):
                issues.append(
                    f"area_units[{code}] parent_code mismatch — "
                    f"DB={db_row.parent_code!r}, source={src.get('parent_code')!r}."
                )

        # province_number populated for CONSTITUENCY nodes (needed for provincial elections)
        for row in db_by_cat.get("CONSTITUENCY", []):
            if row.province_number is None:
                issues.append(
                    f"area_units[{row.code}] CONSTITUENCY has null province_number; "
                    "provincial election generation will fail for this constituency."
                )

        # province_number populated for DISTRICT nodes
        for row in db_by_cat.get("DISTRICT", []):
            if row.province_number is None:
                issues.append(
                    f"area_units[{row.code}] DISTRICT has null province_number."
                )

    finally:
        db.close()

    return issues


# ---------------------------------------------------------------------------
# Provincial coverage check
# ---------------------------------------------------------------------------

def validate_provincial_coverage() -> list[str]:
    """Verify that each province has the correct number of CONSTITUENCY area_units.

    This is a pre-flight check specifically for provincial election generation.
    Returns blocking issues; empty list means all 7 provinces are ready.
    """
    issues: list[str] = []
    db = SessionLocal()
    try:
        for prov_code, prov_num in PROVINCE_CODE_TO_NUMBER.items():
            expected = EXPECTED_PROVINCE_CONSTITUENCY_COUNTS[prov_num]
            actual = db.execute(
                select(func.count()).select_from(AreaUnit).where(
                    AreaUnit.category == "CONSTITUENCY",
                    AreaUnit.province_number == prov_num,
                )
            ).scalar_one()
            if actual != expected:
                issues.append(
                    f"Provincial coverage — province {prov_code} "
                    f"(number {prov_num}): {actual} CONSTITUENCY area_units, "
                    f"expected {expected}. "
                    "Provincial election generation will fail for this province."
                )

        # Also verify the source mapping matches (cross-check JSON vs DB)
        json_map = province_constituency_map()
        for prov_code, constituencies in json_map.items():
            prov_num = PROVINCE_CODE_TO_NUMBER[prov_code]
            expected = EXPECTED_PROVINCE_CONSTITUENCY_COUNTS[prov_num]
            if len(constituencies) != expected:
                issues.append(
                    f"Source map — province {prov_code}: "
                    f"{len(constituencies)} constituencies in JSON, expected {expected}."
                )

    finally:
        db.close()

    return issues


# ---------------------------------------------------------------------------
# Aggregate runner
# ---------------------------------------------------------------------------

def validate_all() -> dict:
    """Run all four validation suites and return a structured report."""
    source_issues = validate_json_source()
    db_issues = validate_database()
    au_issues = validate_area_units()
    prov_issues = validate_provincial_coverage()

    return {
        "source_valid": len(source_issues) == 0,
        "source_issues": source_issues,
        "db_valid": len(db_issues) == 0,
        "db_issues": db_issues,
        "area_units_valid": len(au_issues) == 0,
        "area_units_issues": au_issues,
        "provincial_coverage_valid": len(prov_issues) == 0,
        "provincial_coverage_issues": prov_issues,
        "overall_valid": all(
            len(x) == 0 for x in (source_issues, db_issues, au_issues, prov_issues)
        ),
    }


# ---------------------------------------------------------------------------
# CLI entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 65)
    print("Nepal Geography Validation")
    print("=" * 65)

    result = validate_all()

    sections = [
        ("Geography source file", "source_valid", "source_issues"),
        ("Districts / constituencies (legacy tables)", "db_valid", "db_issues"),
        ("Area units table", "area_units_valid", "area_units_issues"),
        ("Provincial election coverage", "provincial_coverage_valid", "provincial_coverage_issues"),
    ]

    for label, valid_key, issues_key in sections:
        status = "PASS" if result[valid_key] else "FAIL"
        print(f"\n{label}: {status}")
        for issue in result[issues_key]:
            print(f"  - {issue}")

    print()
    print("=" * 65)
    overall = "PASS" if result["overall_valid"] else "FAIL"
    print(f"Overall: {overall}")
    print("=" * 65)
