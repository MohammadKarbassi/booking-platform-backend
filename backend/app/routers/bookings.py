from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Booking, BookingStatus, Review, User
from ..pricing import quote
from ..routers.accommodations import get_active
from ..security import current_user
from ..serializers import booking_out
from ..services import fill_from_waitlist, hold_deadline, new_code, refund_payments, release, reserve, sweep

router = APIRouter(prefix="/bookings", tags=["Bookings"])


class BookingCreate(BaseModel):
    accommodation_id: int
    check_in: date
    check_out: date
    guests_count: int = Field(ge=1)


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(None, max_length=2000)


def own_booking(db: Session, booking_id: int, user: User) -> Booking:
    b = db.get(Booking, booking_id)
    if not b or b.user_id != user.id:
        raise HTTPException(404, "Booking not found")
    return b


@router.post("", status_code=201, summary="Reserve dates; held for 15 minutes until payment")
def create(body: BookingCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    sweep(db)
    acc = get_active(db, body.accommodation_id)
    q = quote(db, acc, body.check_in, body.check_out, body.guests_count)
    booking = Booking(booking_code=new_code(), user_id=user.id, accommodation_id=acc.id, check_in=body.check_in,
                      check_out=body.check_out, guests_count=body.guests_count, total_price=q["total_price"],
                      status=BookingStatus.pending_payment, expires_at=hold_deadline())
    reserve(db, booking, q["breakdown"])  # 409 if any night is taken -> client may offer the waitlist
    db.commit()
    return booking_out(booking)


@router.get("/me", summary="My bookings")
def my_bookings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    sweep(db)
    return [booking_out(b) for b in db.scalars(select(Booking).where(Booking.user_id == user.id)
                                               .order_by(Booking.created_at.desc()))]


@router.get("/{booking_id}")
def get_booking(booking_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return booking_out(own_booking(db, booking_id, user))


@router.post("/{booking_id}/cancel", summary="Cancel, free the nights, refund, and auto-book the waitlist")
def cancel(booking_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    b = own_booking(db, booking_id, user)
    if b.status not in (BookingStatus.pending_payment, BookingStatus.confirmed):
        raise HTTPException(409, f"Cannot cancel a {b.status.value} booking")
    if b.check_in <= date.today():
        raise HTTPException(409, "Cannot cancel on or after check-in day")
    release(db, b, BookingStatus.cancelled)
    refund_payments(b.payments)
    auto = fill_from_waitlist(db, b.accommodation_id)
    db.commit()
    return {**booking_out(b), "waitlist_bookings_created": auto}


@router.post("/{booking_id}/review", status_code=201, summary="Review a completed stay (one per booking)")
def review(booking_id: int, body: ReviewCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    b = own_booking(db, booking_id, user)
    if b.status != BookingStatus.completed:
        raise HTTPException(409, "Only completed stays can be reviewed")
    if b.review:
        raise HTTPException(409, "This stay is already reviewed")
    r = Review(booking_id=b.id, rating=body.rating, comment=body.comment)
    db.add(r)
    db.commit()
    return {"id": r.id, "rating": r.rating, "comment": r.comment, "status": r.status}
