import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, UserRole

SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
DEBUG_OTP = os.getenv("DEBUG_OTP", "1") == "1"  # dev only: echo OTP in response instead of sending SMS
bearer = HTTPBearer(auto_error=False)


def hash_code(phone: str, code: str) -> str:
    return hmac.new(SECRET.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def make_token(user: User) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": str(user.id), "role": user.role.value, "exp": exp}, SECRET, algorithm="HS256")


def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not cred:
        raise HTTPException(401, "Missing bearer token")
    try:
        user_id = int(jwt.decode(cred.credentials, SECRET, algorithms=["HS256"])["sub"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(403, "Admin only")
    return user
