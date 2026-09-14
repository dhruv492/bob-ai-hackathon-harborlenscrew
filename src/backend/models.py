"""Vessel ORM model."""
from sqlalchemy import Column, Integer, String, DateTime, func

from database import Base


class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True)
    vessel_id = Column(String(50), unique=True, nullable=False, index=True)
    eta = Column(String(30), nullable=False)
    berth = Column(String(10), nullable=False)
    cargo = Column(String(100), nullable=False)
    priority = Column(String(50), nullable=False)
    dwell = Column(Integer, nullable=False)
    cranes = Column(Integer, nullable=False)
    utilization = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Port Operator")
    created_at = Column(DateTime, server_default=func.now())
