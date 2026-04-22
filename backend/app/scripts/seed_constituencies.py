"""Seed Nepal's 77 districts and 165 federal HoR constituencies.

Geography is loaded via ``app.core.geography_loader``. Run with:
``python -m app.scripts.seed_constituencies``
"""

from sqlalchemy import select, func

from app.core.geography_loader import (
    load_all,
    PROVINCE_CODE_TO_NUMBER as _PROVINCE_CODE_TO_NUMBER,
)
from app.db.session import SessionLocal
from app.models.district import District
from app.models.constituency import Constituency


def seed(force: bool = False):
    """Seed districts and constituencies from the canonical JSON file.

    Args:
        force: If True, delete existing data and re-seed.
    """
    db = SessionLocal()
    try:
        existing_districts = db.execute(
            select(func.count()).select_from(District)
        ).scalar_one()

        if existing_districts > 0 and not force:
            print(f"Already {existing_districts} districts in DB. Use force=True to re-seed.")
            return

        if force and existing_districts > 0:
            print("Force mode: deleting existing constituencies and districts...")
            db.execute(Constituency.__table__.delete())
            db.execute(District.__table__.delete())
            db.flush()

        data = load_all()

        # Categorize entries
        by_category = {}
        for item in data:
            by_category.setdefault(item["category"], []).append(item)

        districts_json = by_category.get("DISTRICT", [])
        constituencies_json = by_category.get("CONSTITUENCY", [])

        # Validate expected counts
        assert len(by_category.get("PROVINCE", [])) == 7, \
            f"Expected 7 provinces, got {len(by_category.get('PROVINCE', []))}"
        assert len(districts_json) == 77, \
            f"Expected 77 districts, got {len(districts_json)}"
        assert len(constituencies_json) == 165, \
            f"Expected 165 constituencies, got {len(constituencies_json)}"

        # Build district code → DB object mapping
        district_map = {}  # code → District object

        for d in districts_json:
            province_code = d["parent_code"]
            if province_code not in _PROVINCE_CODE_TO_NUMBER:
                raise ValueError(f"District {d['name']} has unknown province code {province_code}")

            district = District(
                code=d["code"],
                name=d["name"],
                province_number=_PROVINCE_CODE_TO_NUMBER[province_code],
            )
            db.add(district)
            db.flush()  # Get the ID
            district_map[d["code"]] = district

        # Seed constituencies (sorted by code for deterministic ordering)
        constituencies_json.sort(key=lambda c: c["code"])
        total_constituencies = 0

        # Track constituency numbers per district
        district_const_counters = {}

        for c in constituencies_json:
            parent_code = c["parent_code"]
            if parent_code not in district_map:
                raise ValueError(
                    f"Constituency {c['name']} ({c['code']}) references unknown district {parent_code}"
                )

            district = district_map[parent_code]
            district_const_counters.setdefault(parent_code, 0)
            district_const_counters[parent_code] += 1
            const_number = district_const_counters[parent_code]

            constituency = Constituency(
                code=c["code"],
                name=c["name"],
                constituency_number=const_number,
                district_id=district.id,
            )
            db.add(constituency)
            total_constituencies += 1

        db.commit()
        print(f"Seeded {len(district_map)} districts and {total_constituencies} constituencies.")

        # Verify final counts
        final_d = db.execute(select(func.count()).select_from(District)).scalar_one()
        final_c = db.execute(select(func.count()).select_from(Constituency)).scalar_one()
        print(f"Final counts: {final_d} districts, {final_c} constituencies")

        if final_c != 165:
            print(f"WARNING: Expected 165 constituencies, got {final_c}.")
        if final_d != 77:
            print(f"WARNING: Expected 77 districts, got {final_d}.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
