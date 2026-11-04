import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Booking, BookingStatus, Payment, PaymentStatus, User, WaitlistRequest, WaitlistStatus
from ..security import current_user
from ..services import fill_from_waitlist, sweep

router = APIRouter(prefix="/payments", tags=["Payments"])
GATEWAY = "mock-zarinpal"  # shortcut: simulated gateway; swap for the real Zarinpal request/verify calls


class PaymentStart(BaseModel):
    booking_id: int | None = None
    waitlist_request_id: int | None = None

    @model_validator(mode="after")
    def one_owner(self):
        if (self.booking_id is None) == (self.waitlist_request_id is None):
            raise ValueError("Send exactly one of booking_id or waitlist_request_id")
        return self


@router.post("/start", summary="Start payment; returns the gateway authority")
def start(body: PaymentStart, user: User = Depends(current_user), db: Session = Depends(get_db)):
    sweep(db)
    if body.booking_id:
        b = db.get(Booking, body.booking_id)
        if not b or b.user_id != user.id:
            raise HTTPException(404, "Booking not found")
        if b.status != BookingStatus.pending_payment:
            raise HTTPException(409, f"Booking is {b.status.value}")
        amount = b.total_price
    else:
        w = db.get(WaitlistRequest, body.waitlist_request_id)
        if not w or w.user_id != user.id:
            raise HTTPException(404, "Waitlist request not found")
        if w.status != WaitlistStatus.waiting or any(p.status == PaymentStatus.success for p in w.payments):
            raise HTTPException(409, "Waitlist request is not awaiting payment")
        amount = w.held_amount
    p = Payment(booking_id=body.booking_id, waitlist_request_id=body.waitlist_request_id, amount=amount,
                gateway=GATEWAY, authority=uuid.uuid4().hex)
    db.add(p)
    db.commit()
    return {"payment_id": p.id, "amount": amount, "authority": p.authority,
            "gateway_url": f"/payments/callback?authority={p.authority}&status=OK"}


@router.get("/callback", summary="Gateway redirect back (status=OK success, NOK failure)")
def callback(authority: str, status: str = Query(pattern="^(OK|NOK)$"), db: Session = Depends(get_db)):
    p = db.scalar(select(Payment).where(Payment.authority == authority))
    if not p:
        raise HTTPException(404, "Unknown authority")
    if p.status != PaymentStatus.initiated:
        raise HTTPException(409, f"Payment already {p.status.value}")
    if status == "NOK":
        p.status = PaymentStatus.failed
        db.commit()
        return {"payment_id": p.id, "status": p.status}
    p.status, p.paid_at, p.ref_id = PaymentStatus.success, datetime.now(), str(secrets.randbelow(10**10))
    result = {"payment_id": p.id, "status": p.status, "ref_id": p.ref_id}
    if p.booking_id:
        b = p.booking
        if b.status == BookingStatus.pending_payment and b.expires_at > datetime.now():
            b.status, b.expires_at = BookingStatus.confirmed, None
        else:  # hold ran out before the money arrived
            p.status, p.refunded_at = PaymentStatus.refunded, datetime.now()
        result |= {"payment_status": p.status, "booking_id": b.id, "booking_status": b.status}
    else:
        db.flush()
        result |= {"waitlist_request_id": p.waitlist_request_id,
                   "auto_booked": fill_from_waitlist(db, p.waitlist_request.accommodation_id)}
    db.commit()
    return result
