"""Seed the area_units table from the canonical geography source.

Loads all entries: country, provinces, districts, federal constituencies,
municipalities, rural municipalities, metropolitan cities, sub-metropolitan cities.

Also backfills area_id on existing election_contests that have constituency_id set.

Geography data is loaded via app.core.geography_loader, which reads from
``nepal_geography.json`` (clean extraction) with fallback to the RTF source
``Constituencies, Provinces and Municipalities.json`` — both in the repo root.

Run:  python -m app.scripts.seed_area_units
"""

from sqlalchemy import select, func

from app.core.geography_loader import load_all, resolve_province_number
from app.db.session import SessionLocal
from app.models.area_unit import AreaUnit
from app.models.constituency import Constituency
from app.models.election_contest import ElectionContest


def seed(force: bool = False):
    """Seed area_units from canonical JSON."""
    db = SessionLocal()
    try:
        existing = db.execute(select(func.count()).select_from(AreaUnit)).scalar_one()

        if existing > 0 and not force:
            print(f"Already {existing} area_units in DB. Use force=True to re-seed.")
            return

        if force and existing > 0:
            print("Force mode: deleting existing area_units...")
            db.execute(AreaUnit.__table__.delete())
            db.flush()

        data = load_all()
        code_to_item = {item["code"]: item for item in data}

        total = 0
        for item in data:
            prov_num = resolve_province_number(item, code_to_item)
            au = AreaUnit(
                code=item["code"],
                name=item["name"],
                category=item["category"],
                parent_code=item.get("parent_code"),
                province_number=prov_num,
            )
            db.add(au)
            total += 1

        db.commit()
        print(f"Seeded {total} area_units.")

        # Verify counts
        by_cat = {}
        for item in data:
            by_cat.setdefault(item["category"], 0)
            by_cat[item["category"]] += 1
        for cat, count in sorted(by_cat.items()):
            print(f"  {cat}: {count}")

        # Backfill area_id on existing election_contests
        _backfill_contest_area_ids(db)

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


def _backfill_contest_area_ids(db):
    """For existing federal contests with constituency_id set,
    find the matching area_unit and set area_id."""
    contests = list(
        db.execute(
            select(ElectionContest).where(
                ElectionContest.constituency_id.isnot(None),
                ElectionContest.area_id.is_(None),
            )
        ).scalars().all()
    )

    if not contests:
        print("No contests need area_id backfill.")
        return

    # Build constituency.id → constituency.code mapping
    constituencies = list(db.execute(select(Constituency)).scalars().all())
    const_id_to_code = {c.id: c.code for c in constituencies}

    # Build area_unit code → area_unit.id mapping
    area_units = list(db.execute(select(AreaUnit)).scalars().all())
    code_to_area_id = {au.code: au.id for au in area_units}

    backfilled = 0
    for contest in contests:
        code = const_id_to_code.get(contest.constituency_id)
        if code and code in code_to_area_id:
            contest.area_id = code_to_area_id[code]
            backfilled += 1

    # Also backfill PR contests: area_id = NP (country)
    pr_contests = list(
        db.execute(
            select(ElectionContest).where(
                ElectionContest.contest_type == "PR",
                ElectionContest.area_id.is_(None),
            )
        ).scalars().all()
    )
    np_area_id = code_to_area_id.get("NP")
    for contest in pr_contests:
        if np_area_id:
            contest.area_id = np_area_id
            backfilled += 1

    db.commit()
    print(f"Backfilled area_id on {backfilled} election contests.")


if __name__ == "__main__":
    seed()
