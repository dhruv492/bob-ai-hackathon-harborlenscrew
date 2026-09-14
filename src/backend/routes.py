"""REST API routes for vessel CRUD operations."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Vessel
from schemas import VesselCreate, VesselUpdate, VesselResponse

router = APIRouter(prefix="/api")


@router.get("/vessels", response_model=List[VesselResponse])
def list_vessels(db: Session = Depends(get_db)):
    """Return every vessel ordered by id."""
    return db.query(Vessel).order_by(Vessel.id).all()


@router.get("/vessels/{vessel_db_id}", response_model=VesselResponse)
def get_vessel(vessel_db_id: int, db: Session = Depends(get_db)):
    """Return a single vessel by primary key."""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_db_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel


@router.post("/vessels", response_model=VesselResponse, status_code=201)
def create_vessel(payload: VesselCreate, db: Session = Depends(get_db)):
    """Insert a new vessel."""
    if db.query(Vessel).filter(Vessel.vessel_id == payload.vessel_id).first():
        raise HTTPException(status_code=409, detail="vessel_id already exists")
    vessel = Vessel(**payload.model_dump())
    db.add(vessel)
    db.commit()
    db.refresh(vessel)
    return vessel


@router.put("/vessels/{vessel_db_id}", response_model=VesselResponse)
def update_vessel(vessel_db_id: int, payload: VesselUpdate, db: Session = Depends(get_db)):
    """Update an existing vessel (partial update supported)."""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_db_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    updates = payload.model_dump(exclude_unset=True)
    # Check uniqueness if vessel_id is being changed
    if "vessel_id" in updates and updates["vessel_id"] != vessel.vessel_id:
        if db.query(Vessel).filter(Vessel.vessel_id == updates["vessel_id"]).first():
            raise HTTPException(status_code=409, detail="vessel_id already exists")
    for key, value in updates.items():
        setattr(vessel, key, value)
    db.commit()
    db.refresh(vessel)
    return vessel


@router.delete("/vessels/{vessel_db_id}", status_code=204)
def delete_vessel(vessel_db_id: int, db: Session = Depends(get_db)):
    """Remove a vessel."""
    vessel = db.query(Vessel).filter(Vessel.id == vessel_db_id).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    db.delete(vessel)
    db.commit()
