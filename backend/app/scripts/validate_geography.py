"""Geography validation checks for Nepal federal structure.

Validates districts and constituencies against the canonical JSON source.
Run:  python -m app.scripts.validate_geography
"""

import json
import os
import re
from collections import Counter

from sqlalchemy import select, func

from app.db.session import SessionLocal
from app.models.district import District
from app.models.constituency import Constituency


EXPECTED_PROVINCES = 7
EXPECTED_DISTRICTS = 77
EXPECTED_CONSTITUENCIES = 165

# Province constituency totals from canonical data
EXPECTED_PROVINCE_TOTALS = {
    1: 28, 2: 32, 3: 33, 4: 18, 5: 26, 6: 12, 7: 16,
}


def _load_geography_json() -> list[dict]:
    """Load canonical geography data."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    clean_path = os.path.join(repo_root, "nepal_geography.json")
    if os.path.exists(clean_path):
        with open(clean_path, "r", encoding="utf-8") as f:
            return json.load(f)

    rtf_path = os.path.join(repo_root, "Constituencies, Provinces and Municipalities.json")
    with open(rtf_path, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    text = raw[raw.find("["):]
    text = text[: text.rfind("]") + 1]
    text = text.replace("\\{", "{").replace("\\}", "}")
    text = re.sub(r"\\[a-z]+\\d*\\s?", "", text)
    text = text.replace("\\", "")
    return json.loads(text)


def validate_json_source() -> list[str]:
    """Validate the JSON source file itself."""
    issues = []
    data = _load_geography_json()

    by_cat = {}
    for item in data:
        by_cat.setdefault(item["category"], []).append(item)

    provinces = by_cat.get("PROVINCE", [])
    districts = by_cat.get("DISTRICT", [])
    constituencies = by_cat.get("CONSTITUENCY", [])

    if len(provinces) != EXPECTED_PROVINCES:
        issues.append(f"JSON: expected {EXPECTED_PROVINCES} provinces, got {len(provinces)}")
    if len(districts) != EXPECTED_DISTRICTS:
        issues.append(f"JSON: expected {EXPECTED_DISTRICTS} districts, got {len(districts)}")
    if len(constituencies) != EXPECTED_CONSTITUENCIES:
        issues.append(f"JSON: expected {EXPECTED_CONSTITUENCIES} constituencies, got {len(constituencies)}")

    # Check for duplicate codes
    district_codes = [d["code"] for d in districts]
    dupes = [code for code, cnt in Counter(district_codes).items() if cnt > 1]
    if dupes:
        issues.append(f"JSON: duplicate district codes: {dupes}")

    const_codes = [c["code"] for c in constituencies]
    dupes = [code for code, cnt in Counter(const_codes).items() if cnt > 1]
    if dupes:
        issues.append(f"JSON: duplicate constituency codes: {dupes}")

    # Check parent-child: all districts reference valid province codes
    province_codes = {p["code"] for p in provinces}
    for d in districts:
        if d["parent_code"] not in province_codes:
            issues.append(f"JSON: district {d['name']} ({d['code']}) has invalid parent {d['parent_code']}")

    # Check parent-child: all constituencies reference valid district codes
    district_code_set = set(district_codes)
    for c in constituencies:
        if c["parent_code"] not in district_code_set:
            issues.append(f"JSON: constituency {c['name']} ({c['code']}) has invalid parent {c['parent_code']}")

    # Check duplicate constituency names within a district
    const_by_district = {}
    for c in constituencies:
        const_by_district.setdefault(c["parent_code"], []).append(c["name"])
    for d_code, names in const_by_district.items():
        name_dupes = [n for n, cnt in Counter(names).items() if cnt > 1]
        if name_dupes:
            issues.append(f"JSON: duplicate constituency names in {d_code}: {name_dupes}")

    return issues


def validate_database() -> list[str]:
    """Validate the current database geography against the canonical JSON."""
    issues = []
    db = SessionLocal()
    try:
        data = _load_geography_json()
        by_cat = {}
        for item in data:
            by_cat.setdefault(item["category"], []).append(item)

        json_districts = {d["code"]: d for d in by_cat["DISTRICT"]}
        json_constituencies = {c["code"]: c for c in by_cat["CONSTITUENCY"]}
        province_map = {"P1": 1, "P2": 2, "P3": 3, "P4": 4, "P5": 5, "P6": 6, "P7": 7}

        # 1. Check district count
        db_district_count = db.execute(select(func.count()).select_from(District)).scalar_one()
        if db_district_count != EXPECTED_DISTRICTS:
            issues.append(f"DB: expected {EXPECTED_DISTRICTS} districts, got {db_district_count}")

        # 2. Check constituency count
        db_const_count = db.execute(select(func.count()).select_from(Constituency)).scalar_one()
        if db_const_count != EXPECTED_CONSTITUENCIES:
            issues.append(f"DB: expected {EXPECTED_CONSTITUENCIES} constituencies, got {db_const_count}")

        # 3. Check each district matches JSON
        db_districts = list(db.execute(select(District)).scalars().all())
        db_district_by_code = {}
        for d in db_districts:
            if d.code is None:
                issues.append(f"DB: district '{d.name}' (id={d.id}) has null code")
                continue
            if d.code in db_district_by_code:
                issues.append(f"DB: duplicate district code '{d.code}'")
            db_district_by_code[d.code] = d

            if d.code not in json_districts:
                issues.append(f"DB: district '{d.name}' ({d.code}) not in canonical JSON")
            else:
                jd = json_districts[d.code]
                if d.name != jd["name"]:
                    issues.append(f"DB: district {d.code} name mismatch: DB='{d.name}', JSON='{jd['name']}'")
                expected_prov = province_map[jd["parent_code"]]
                if d.province_number != expected_prov:
                    issues.append(f"DB: district {d.code} province mismatch: DB={d.province_number}, JSON={expected_prov}")

        # Check for missing districts
        for code in json_districts:
            if code not in db_district_by_code:
                issues.append(f"DB: missing district {json_districts[code]['name']} ({code})")

        # 4. Check each constituency matches JSON
        db_constituencies = list(db.execute(select(Constituency)).scalars().all())
        db_const_by_code = {}
        for c in db_constituencies:
            if c.code is None:
                issues.append(f"DB: constituency '{c.name}' (id={c.id}) has null code")
                continue
            if c.code in db_const_by_code:
                issues.append(f"DB: duplicate constituency code '{c.code}'")
            db_const_by_code[c.code] = c

            if c.code not in json_constituencies:
                issues.append(f"DB: constituency '{c.name}' ({c.code}) not in canonical JSON")
            else:
                jc = json_constituencies[c.code]
                if c.name != jc["name"]:
                    issues.append(f"DB: constituency {c.code} name mismatch: DB='{c.name}', JSON='{jc['name']}'")
                # Check parent district
                expected_district_code = jc["parent_code"]
                if c.district_id not in [d.id for d in db_districts if d.code == expected_district_code]:
                    issues.append(f"DB: constituency {c.code} has wrong district_id")

        # Check for missing constituencies
        for code in json_constituencies:
            if code not in db_const_by_code:
                issues.append(f"DB: missing constituency {json_constituencies[code]['name']} ({code})")

        # 5. Check province totals
        prov_totals = {}
        for c in db_constituencies:
            district = next((d for d in db_districts if d.id == c.district_id), None)
            if district:
                prov_totals.setdefault(district.province_number, 0)
                prov_totals[district.province_number] += 1
        for prov, expected in EXPECTED_PROVINCE_TOTALS.items():
            actual = prov_totals.get(prov, 0)
            if actual != expected:
                issues.append(f"DB: province {prov} has {actual} constituencies, expected {expected}")

    finally:
        db.close()

    return issues


def validate_all() -> dict:
    """Run all validation checks."""
    json_issues = validate_json_source()
    db_issues = validate_database()

    result = {
        "json_valid": len(json_issues) == 0,
        "json_issues": json_issues,
        "db_valid": len(db_issues) == 0,
        "db_issues": db_issues,
        "overall_valid": len(json_issues) == 0 and len(db_issues) == 0,
    }

    return result


if __name__ == "__main__":
    print("=" * 60)
    print("Nepal Geography Validation")
    print("=" * 60)

    result = validate_all()

    print(f"\nJSON source: {'PASS' if result['json_valid'] else 'FAIL'}")
    for issue in result["json_issues"]:
        print(f"  - {issue}")

    print(f"\nDatabase: {'PASS' if result['db_valid'] else 'FAIL'}")
    for issue in result["db_issues"]:
        print(f"  - {issue}")

    print(f"\nOverall: {'PASS' if result['overall_valid'] else 'FAIL'}")
