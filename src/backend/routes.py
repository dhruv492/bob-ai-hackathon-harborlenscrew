"""REST API routes for vessel CRUD operations (per-user scoped)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Vessel, User
from schemas import VesselCreate, VesselUpdate, VesselResponse
from auth import require_user
from seed import ensure_user_fleet

router = APIRouter(prefix="/api")


def _owned(db: Session, vessel_db_id: int, user: User) -> Vessel:
    vessel = db.query(Vessel).filter(Vessel.id == vessel_db_id, Vessel.user_id == user.id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel


@router.get("/vessels", response_model=List[VesselResponse])
def list_vessels(db: Session = Depends(get_db), user: User = Depends(require_user)):
    """Return the authenticated user's vessels only."""
    ensure_user_fleet(db, user.id)
    return db.query(Vessel).filter(Vessel.user_id == user.id).order_by(Vessel.id).all()


@router.get("/vessels/{vessel_db_id}", response_model=VesselResponse)
def get_vessel(vessel_db_id: int, db: Session = Depends(get_db), user: User = Depends(require_user)):
    return _owned(db, vessel_db_id, user)


@router.post("/vessels", response_model=VesselResponse, status_code=201)
def create_vessel(
    payload: VesselCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    exists = (
        db.query(Vessel)
        .filter(Vessel.user_id == user.id, Vessel.vessel_id == payload.vessel_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="vessel_id already exists")
    vessel = Vessel(**payload.model_dump(), user_id=user.id)
    db.add(vessel)
    db.commit()
    db.refresh(vessel)
    return vessel


@router.put("/vessels/{vessel_db_id}", response_model=VesselResponse)
def update_vessel(
    vessel_db_id: int,
    payload: VesselUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    vessel = _owned(db, vessel_db_id, user)
    updates = payload.model_dump(exclude_unset=True)
    if "vessel_id" in updates and updates["vessel_id"] != vessel.vessel_id:
        clash = (
            db.query(Vessel)
            .filter(
                Vessel.user_id == user.id,
                Vessel.vessel_id == updates["vessel_id"],
                Vessel.id != vessel.id,
            )
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="vessel_id already exists")
    for key, value in updates.items():
        setattr(vessel, key, value)
    db.commit()
    db.refresh(vessel)
    return vessel


@router.delete("/vessels/{vessel_db_id}", status_code=204)
def delete_vessel(
    vessel_db_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    vessel = _owned(db, vessel_db_id, user)
    db.delete(vessel)
    db.commit()
