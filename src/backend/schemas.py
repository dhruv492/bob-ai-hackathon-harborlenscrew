"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

VALID_PRIORITIES = {"Cold chain", "Connection-sensitive", "High value", "Standard"}


class VesselCreate(BaseModel):
    vessel_id: str = Field(..., min_length=1, max_length=50, examples=["MV-Aster"])
    eta: str = Field(..., min_length=1, max_length=30, examples=["06:00"])
    berth: str = Field(..., min_length=1, max_length=10, examples=["B-03"])
    cargo: str = Field(..., min_length=1, max_length=100, examples=["Reefer containers"])
    priority: str = Field(..., examples=["Cold chain"])
    dwell: int = Field(..., ge=1, le=168, examples=[18])
    cranes: int = Field(..., ge=1, le=10, examples=[3])
    utilization: int = Field(..., ge=0, le=100, examples=[88])

    @field_validator("priority")
    @classmethod
    def check_priority(cls, v: str) -> str:
        if v not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return v


class VesselUpdate(BaseModel):
    vessel_id: Optional[str] = Field(None, min_length=1, max_length=50)
    eta: Optional[str] = Field(None, min_length=1, max_length=30)
    berth: Optional[str] = Field(None, min_length=1, max_length=10)
    cargo: Optional[str] = Field(None, min_length=1, max_length=100)
    priority: Optional[str] = None
    dwell: Optional[int] = Field(None, ge=1, le=168)
    cranes: Optional[int] = Field(None, ge=1, le=10)
    utilization: Optional[int] = Field(None, ge=0, le=100)

    @field_validator("priority")
    @classmethod
    def check_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return v


class VesselResponse(BaseModel):
    id: int
    vessel_id: str
    eta: str
    berth: str
    cargo: str
    priority: str
    dwell: int
    cranes: int
    utilization: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
