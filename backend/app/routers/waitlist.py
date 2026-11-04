from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import BookingNight, User, WaitlistRequest, WaitlistStatus
from ..pricing import quote
from ..routers.accommodations import get_active
from ..security import current_user
from ..services import refund_payments, sweep

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


class WaitlistCreate(BaseModel):
    accommodation_id: int
    check_in: date
    check_out: date
    guests_count: int = Field(ge=1)


def out(w: WaitlistRequest) -> dict:
    return {"id": w.id, "accommodation_id": w.accommodation_id, "check_in": w.check_in, "check_out": w.check_out,
            "guests_count": w.guests_count, "held_amount": w.held_amount, "status": w.status,
            "expires_at": w.expires_at, "booking_id": w.booking_id,
            "paid": any(p.status.value in ("success", "refunded") for p in w.payments)}


@router.post("", status_code=201, summary="Join the queue for fully-booked dates (pay upfront next)")
def join(body: WaitlistCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    sweep(db)
    acc = get_active(db, body.accommodation_id)
    q = quote(db, acc, body.check_in, body.check_out, body.guests_count)
    taken = db.scalar(select(exists().where(BookingNight.accommodation_id == acc.id,
                                            BookingNight.night_date >= body.check_in,
                                            BookingNight.night_date < body.check_out)))
    if not taken:
        raise HTTPException(409, "These dates are free; book them directly")
    w = WaitlistRequest(user_id=user.id, accommodation_id=acc.id, check_in=body.check_in, check_out=body.check_out,
                        guests_count=body.guests_count, held_amount=q["total_price"],
                        expires_at=datetime.combine(body.check_in, time.min))  # refund if not freed before check-in
    db.add(w)
    db.commit()
    return out(w)


@router.get("/me")
def mine(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sweep(db)
    return [out(w) for w in db.scalars(select(WaitlistRequest).where(WaitlistRequest.user_id == user.id)
                                       .order_by(WaitlistRequest.created_at.desc()))]


@router.post("/{wid}/cancel", summary="Leave the queue and get a refund")
def cancel(wid: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    w = db.get(WaitlistRequest, wid)
    if not w or w.user_id != user.id:
        raise HTTPException(404, "Waitlist request not found")
    if w.status != WaitlistStatus.waiting:
        raise HTTPException(409, f"Request is {w.status.value}")
    w.status = WaitlistStatus.cancelled
    refund_payments(w.payments)
    db.commit()
    return out(w)
