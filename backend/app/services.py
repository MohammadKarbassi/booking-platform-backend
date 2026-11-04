"""Booking lifecycle: reserve nights (DB-locked), expire stale holds, refund, auto-book from waitlist."""
import secrets
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .models import (Accommodation, Booking, BookingNight, BookingStatus, Payment, PaymentStatus, WaitlistRequest,
                     WaitlistStatus)
from .pricing import quote

HOLD_MINUTES = 15


def new_code() -> str:
    return "BK" + secrets.token_hex(4).upper()


def reserve(db: Session, booking: Booking, breakdown: list[dict]) -> None:
    """Insert one booking_nights row per night. The PK (accommodation_id, night_date) makes the DB
    reject any night that is already taken, even under concurrent requests."""
    try:
        with db.begin_nested():
            db.add(booking)
            db.flush()
            db.add_all(BookingNight(booking_id=booking.id, accommodation_id=booking.accommodation_id,
                                    night_date=b["night"], price=b["price"], pricing_rule_id=b["pricing_rule_id"])
                       for b in breakdown)
            db.flush()
    except IntegrityError:
        raise HTTPException(409, "Some of these nights are already booked")


def refund_payments(payments: list[Payment]) -> None:
    for p in payments:
        if p.status == PaymentStatus.success:
            p.status, p.refunded_at = PaymentStatus.refunded, datetime.now()


def release(db: Session, booking: Booking, status: BookingStatus) -> None:
    booking.status = status
    if status == BookingStatus.cancelled:
        booking.cancelled_at = datetime.now()
    booking.nights.clear()  # frees the dates
    db.flush()


def fill_from_waitlist(db: Session, accommodation_id: int) -> list[int]:
    """First come, first served: the oldest paid waitlist request whose nights are all free gets booked."""
    booked = []
    queue = db.scalars(select(WaitlistRequest).where(
        WaitlistRequest.accommodation_id == accommodation_id, WaitlistRequest.status == WaitlistStatus.waiting,
        WaitlistRequest.expires_at > datetime.now()).order_by(WaitlistRequest.created_at)).all()
    for w in queue:
        paid = [p for p in w.payments if p.status == PaymentStatus.success]
        if not paid:
            continue
        booking = Booking(booking_code=new_code(), user_id=w.user_id, accommodation_id=w.accommodation_id,
                          check_in=w.check_in, check_out=w.check_out, guests_count=w.guests_count,
                          total_price=w.held_amount, status=BookingStatus.confirmed)
        acc = db.get(Accommodation, w.accommodation_id)
        try:
            # price snapshot is the held amount; per-night prices are recomputed only for the night rows
            reserve(db, booking, quote(db, acc, w.check_in, w.check_out, w.guests_count)["breakdown"])
        except HTTPException:
            continue
        w.status, w.booking_id = WaitlistStatus.fulfilled, booking.id
        for p in paid:
            p.booking_id = booking.id
        booked.append(booking.id)
    return booked


def sweep(db: Session) -> None:
    """shortcut: expiry runs lazily on each relevant request, not in a background worker; add a cron/Celery beat
    job when traffic is real."""
    now = datetime.now()
    touched = set()
    for b in db.scalars(select(Booking).where(Booking.status == BookingStatus.pending_payment,
                                              Booking.expires_at < now)):
        release(db, b, BookingStatus.expired)
        touched.add(b.accommodation_id)
    for w in db.scalars(select(WaitlistRequest).where(WaitlistRequest.status == WaitlistStatus.waiting,
                                                      WaitlistRequest.expires_at < now)):
        w.status = WaitlistStatus.expired
        refund_payments(w.payments)
    for acc_id in touched:
        fill_from_waitlist(db, acc_id)
    db.commit()


def hold_deadline() -> datetime:
    return datetime.now() + timedelta(minutes=HOLD_MINUTES)
