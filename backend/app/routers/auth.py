import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import OtpCode, User
from ..security import DEBUG_OTP, current_user, hash_code, make_token

router = APIRouter(prefix="/auth", tags=["Auth"])
PHONE = Field(pattern=r"^09\d{9}$", examples=["09121234567"])


class OtpRequest(BaseModel):
    phone: str = PHONE


class OtpVerify(BaseModel):
    phone: str = PHONE
    code: str = Field(pattern=r"^\d{5}$")


class ProfileUpdate(BaseModel):
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    email: EmailStr | None = None


def user_out(u: User) -> dict:
    return {"id": u.id, "phone": u.phone, "email": u.email, "first_name": u.first_name,
            "last_name": u.last_name, "role": u.role}


@router.post("/otp/request", summary="Send a 5-digit login code to the phone")
def request_otp(body: OtpRequest, db: Session = Depends(get_db)):
    last = db.scalar(select(OtpCode).where(OtpCode.phone == body.phone).order_by(OtpCode.created_at.desc()))
    if last and last.created_at > datetime.now() - timedelta(minutes=1):
        raise HTTPException(429, "Wait one minute before requesting another code")
    code = f"{secrets.randbelow(100000):05d}"
    db.add(OtpCode(phone=body.phone, code_hash=hash_code(body.phone, code),
                   expires_at=datetime.now() + timedelta(minutes=2), created_at=datetime.now()))
    db.commit()
    # shortcut: no SMS provider yet, the code is returned in dev mode; set DEBUG_OTP=0 and plug in an SMS API for prod
    return {"message": "Code sent", "expires_in_seconds": 120, **({"debug_code": code} if DEBUG_OTP else {})}


@router.post("/otp/verify", summary="Verify code, sign up if new, and get a JWT")
def verify_otp(body: OtpVerify, db: Session = Depends(get_db)):
    otp = db.scalar(select(OtpCode).where(OtpCode.phone == body.phone, OtpCode.used_at.is_(None),
                                          OtpCode.expires_at > datetime.now()).order_by(OtpCode.created_at.desc()))
    if not otp or otp.code_hash != hash_code(body.phone, body.code):
        raise HTTPException(400, "Wrong or expired code")
    otp.used_at = datetime.now()
    user = db.scalar(select(User).where(User.phone == body.phone))
    is_new = user is None
    if is_new:
        user = User(phone=body.phone)
        db.add(user)
    db.commit()
    return {"access_token": make_token(user), "token_type": "bearer", "is_new_user": is_new, "user": user_out(user)}


@router.get("/me", summary="Current user profile")
def me(user: User = Depends(current_user)):
    return user_out(user)


@router.patch("/me", summary="Update profile")
def update_me(body: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    return user_out(user)
