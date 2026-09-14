"""Seed helpers — each user gets their own starter fleet."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import engine, SessionLocal, Base
from models import Vessel, User

SEED_DATA = [
    {"vessel_id": "MV-Aster", "eta": "06:00", "berth": "B-03", "cargo": "Reefer containers", "priority": "Cold chain", "dwell": 18, "cranes": 3, "utilization": 88},
    {"vessel_id": "MV-Northstar", "eta": "09:00", "berth": "B-01", "cargo": "Auto components", "priority": "Connection-sensitive", "dwell": 12, "cranes": 2, "utilization": 76},
    {"vessel_id": "MV-Kestrel", "eta": "13:00", "berth": "B-02", "cargo": "Mixed retail", "priority": "Standard", "dwell": 7, "cranes": 2, "utilization": 69},
    {"vessel_id": "MV-Solace", "eta": "18:00", "berth": "B-04", "cargo": "Project cargo", "priority": "High value", "dwell": 10, "cranes": 1, "utilization": 82},
    {"vessel_id": "MV-Atlas", "eta": "Day 2 · 04:00", "berth": "B-01", "cargo": "Dry bulk", "priority": "Standard", "dwell": 5, "cranes": 2, "utilization": 61},
]


def ensure_user_fleet(db, user_id: int) -> int:
    """Copy starter vessels for a user if they have none yet. Returns count added."""
    if db.query(Vessel).filter(Vessel.user_id == user_id).count() > 0:
        return 0
    for data in SEED_DATA:
        db.add(Vessel(**data, user_id=user_id))
    db.commit()
    return len(SEED_DATA)


def seed():
    """Ensure schema exists; seed fleets for any users that have none."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if not users:
            print("No users yet — fleets are created when each user registers or first loads vessels.")
            return
        total = 0
        for user in users:
            total += ensure_user_fleet(db, user.id)
        print(f"Seeded {total} vessels across {len(users)} user(s).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
