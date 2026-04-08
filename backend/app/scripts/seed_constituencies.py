"""Seed Nepal's 77 districts and 165 federal HoR constituencies.

Run:  python -m app.scripts.seed_constituencies
"""

from app.db.session import SessionLocal
from app.models.district import District
from app.models.constituency import Constituency
from sqlalchemy import select, func

# ── Nepal's 77 districts grouped by province ────────────────────
# Source: Election Commission of Nepal, Federal HoR constituency allocation
# Official totals: P1=28, P2=32, P3=33, P4=18, P5=24, P6=12, P7=18 = 165
# Format: (district_name, province_number, number_of_constituencies)

DISTRICT_DATA = [
    # Province 1 — Koshi (28 constituencies)
    ("Taplejung", 1, 1),
    ("Panchthar", 1, 2),
    ("Ilam", 1, 2),
    ("Jhapa", 1, 4),
    ("Morang", 1, 6),
    ("Sunsari", 1, 3),
    ("Dhankuta", 1, 1),
    ("Terhathum", 1, 1),
    ("Sankhuwasabha", 1, 1),
    ("Bhojpur", 1, 1),
    ("Solukhumbu", 1, 1),
    ("Okhaldhunga", 1, 1),
    ("Khotang", 1, 2),
    ("Udayapur", 1, 2),
    # Province 2 — Madhesh (32 constituencies)
    ("Saptari", 2, 3),
    ("Siraha", 2, 4),
    ("Dhanusha", 2, 4),
    ("Mahottari", 2, 3),
    ("Sarlahi", 2, 4),
    ("Rautahat", 2, 3),
    ("Bara", 2, 4),
    ("Parsa", 2, 4),
    ("Parasi", 2, 3),
    # Province 3 — Bagmati (33 constituencies)
    ("Dolakha", 3, 1),
    ("Sindhupalchok", 3, 2),
    ("Rasuwa", 3, 1),
    ("Dhading", 3, 2),
    ("Nuwakot", 3, 2),
    ("Kathmandu", 3, 10),
    ("Bhaktapur", 3, 2),
    ("Lalitpur", 3, 3),
    ("Kavrepalanchok", 3, 3),
    ("Ramechhap", 3, 1),
    ("Sindhuli", 3, 2),
    ("Makwanpur", 3, 2),
    ("Chitwan", 3, 2),
    # Province 4 — Gandaki (18 constituencies)
    ("Gorkha", 4, 2),
    ("Lamjung", 4, 1),
    ("Tanahu", 4, 2),
    ("Syangja", 4, 2),
    ("Kaski", 4, 3),
    ("Manang", 4, 1),
    ("Mustang", 4, 1),
    ("Myagdi", 4, 1),
    ("Parbat", 4, 1),
    ("Baglung", 4, 2),
    ("Nawalparasi East", 4, 2),
    # Province 5 — Lumbini (24 constituencies)
    ("Nawalparasi West", 5, 2),
    ("Rupandehi", 5, 5),
    ("Kapilvastu", 5, 3),
    ("Palpa", 5, 1),
    ("Arghakhanchi", 5, 1),
    ("Gulmi", 5, 2),
    ("Dang", 5, 3),
    ("Banke", 5, 3),
    ("Bardiya", 5, 2),
    ("Rolpa", 5, 1),
    ("Pyuthan", 5, 1),
    # Province 6 — Karnali (12 constituencies)
    ("Rukum West", 6, 1),
    ("Salyan", 6, 1),
    ("Dolpa", 6, 1),
    ("Humla", 6, 1),
    ("Jumla", 6, 1),
    ("Kalikot", 6, 1),
    ("Mugu", 6, 1),
    ("Surkhet", 6, 2),
    ("Dailekh", 6, 2),
    ("Jajarkot", 6, 1),
    # Province 7 — Sudurpashchim (18 constituencies)
    ("Bajura", 7, 1),
    ("Bajhang", 7, 2),
    ("Achham", 7, 2),
    ("Doti", 7, 1),
    ("Kailali", 7, 4),
    ("Kanchanpur", 7, 3),
    ("Dadeldhura", 7, 1),
    ("Baitadi", 7, 2),
    ("Darchula", 7, 2),
]


def seed():
    db = SessionLocal()
    try:
        existing_districts = db.execute(
            select(func.count()).select_from(District)
        ).scalar_one()

        if existing_districts > 0:
            print(f"Already {existing_districts} districts in DB. Skipping seed.")
            return

        constituency_serial = 0
        total_constituencies = 0

        for district_name, province, num_constituencies in DISTRICT_DATA:
            if num_constituencies == 0:
                continue  # Skip duplicates

            district = District(
                name=district_name,
                province_number=province,
            )
            db.add(district)
            db.flush()  # Get the ID

            for i in range(1, num_constituencies + 1):
                constituency_serial += 1
                c = Constituency(
                    name=f"{district_name}-{i}",
                    constituency_number=i,
                    district_id=district.id,
                )
                db.add(c)
                total_constituencies += 1

        db.commit()
        print(f"Seeded {total_constituencies} constituencies across {len([d for d in DISTRICT_DATA if d[2] > 0])} districts.")

        # Verify
        final_count = db.execute(
            select(func.count()).select_from(Constituency)
        ).scalar_one()
        print(f"Final constituency count in DB: {final_count}")

        if final_count != 165:
            print(f"WARNING: Expected 165, got {final_count}. Check DISTRICT_DATA.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
