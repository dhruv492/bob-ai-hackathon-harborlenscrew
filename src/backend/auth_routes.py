"""Authentication API endpoints: Register, Login, SSO-Demo, Current User Profile."""
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth import (
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
    get_current_user,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str
    remember_me: bool = False


class SSODemoRequest(BaseModel):
    provider: str = Field(..., pattern="^(okta|entra)$")


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    message: str


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with hashed password and return session token."""
    if req.confirm_password and req.password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match.",
        )

    # Check if email is already taken
    existing = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this work email already exists.",
        )

    # Create new user
    new_user = User(
        full_name=req.full_name.strip(),
        email=req.email.strip().lower(),
        password_hash=hash_password(req.password),
        role="Port Operator",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_session_token(
        user_id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        expires_in_days=30,
    )

    return AuthResponse(
        token=token,
        user=UserResponse.from_orm(new_user),
        message="Account created successfully.",
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning session token."""
    user = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )

    expires = 30 if req.remember_me else 1
    token = create_session_token(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        expires_in_days=expires,
    )

    return AuthResponse(
        token=token,
        user=UserResponse.from_orm(user),
        message="Signed in successfully.",
    )


@router.post("/sso-demo", response_model=AuthResponse)
def sso_demo(req: SSODemoRequest, db: Session = Depends(get_db)):
    """Simulated enterprise SSO authentication (Okta or Microsoft Entra)."""
    provider_name = "Microsoft Entra" if req.provider == "entra" else "Okta SSO"
    sso_email = f"operator.{req.provider}@portauthority.io"
    sso_name = f"Enterprise Operator ({provider_name})"

    user = db.query(User).filter(User.email == sso_email).first()
    if not user:
        user = User(
            full_name=sso_name,
            email=sso_email,
            password_hash=hash_password(f"sso-auth-demo-{req.provider}-secret"),
            role="Senior Dispatcher",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_session_token(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        expires_in_days=7,
    )

    return AuthResponse(
        token=token,
        user=UserResponse.from_orm(user),
        message=f"Authenticated via {provider_name}.",
    )


@router.get("/me", response_model=UserResponse)
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Return currently authenticated user profile."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required.",
        )

    token = authorization.replace("Bearer ", "").strip()
    payload = verify_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid.",
        )

    user = db.query(User).filter(User.id == payload["uid"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserResponse.from_orm(user)


@router.post("/logout")
def logout():
    """Client-side session clearance acknowledgement."""
    return {"message": "Logged out successfully."}
