"""Authentication security helpers: password hashing, verification, and session tokens."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "harborlens-secure-dev-auth-secret-key-32b")
ITERATIONS = 100_000


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with a unique random salt."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        ITERATIONS,
    )
    return f"pbkdf2:sha256:{ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, hashed_str: str) -> bool:
    """Verify password against stored pbkdf2 hash using constant-time comparison."""
    try:
        header, salt, stored_hash = hashed_str.split("$")
        parts = header.split(":")
        iterations = int(parts[2])
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(dk.hex(), stored_hash)
    except Exception:
        return False


def create_session_token(user_id: int, email: str, full_name: str, role: str, expires_in_days: int = 7) -> str:
    """Generate a cryptographically signed URL-safe session token."""
    payload = {
        "uid": user_id,
        "email": email,
        "name": full_name,
        "role": role,
        "exp": int(time.time()) + (expires_in_days * 86400),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
    
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        payload_b64.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def verify_session_token(token: str) -> Optional[dict]:
    """Verify digital signature and expiry of a session token."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        
        expected_sig = hmac.new(
            SECRET_KEY.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Add back base64 padding if needed
        padding = "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode((payload_b64 + padding).encode("ascii")).decode("utf-8")
        payload = json.loads(payload_json)

        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """FastAPI dependency to retrieve currently authenticated user from Bearer header."""
    if not authorization:
        return None

    token = authorization.replace("Bearer ", "").strip()
    payload = verify_session_token(token)
    if not payload:
        return None

    user = db.query(User).filter(User.id == payload["uid"]).first()
    return user


def require_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Require a valid Bearer session; raise 401 if missing/invalid."""
    from fastapi import HTTPException, status

    user = get_current_user(authorization=authorization, db=db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return user
