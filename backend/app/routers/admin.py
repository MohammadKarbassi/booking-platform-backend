from datetime import date, time
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (Accommodation, AccommodationCalendar, AccommodationImage, AccommodationStatus,
                      AdjustmentType, Amenity, Booking, BookingStatus, Holiday, Host, PointOfInterest, PricingRule,
                      PricingRuleType, Review, ReviewStatus, User)
from ..pricing import nights_between
from ..security import admin_user
from ..serializers import acc_card, booking_out

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(admin_user)])


def commit(db: Session):
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(409, f"Constraint violated: {e.orig.diag.message_primary}")


# ---------- hosts ----------
class HostIn(BaseModel):
    full_name: str = Field(max_length=150)
    phone: str = Field(pattern=r"^09\d{9}$")


@router.post("/hosts", status_code=201, summary="Register a host (no login in phase 1)")
def create_host(body: HostIn, db: Session = Depends(get_db)):
    h = Host(**body.model_dump())
    db.add(h)
    commit(db)
    return {"id": h.id, "full_name": h.full_name, "phone": h.phone}


@router.get("/hosts")
def list_hosts(db: Session = Depends(get_db)):
    return [{"id": h.id, "full_name": h.full_name, "phone": h.phone} for h in db.scalars(select(Host))]


# ---------- accommodations ----------
class ImageIn(BaseModel):
    url: str = Field(max_length=500)
    is_cover: bool = False


class AccommodationIn(BaseModel):
    host_id: int
    type_id: int
    city_id: int
    title: str = Field(max_length=200)
    slug: str = Field(max_length=220, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    address: str
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
    base_capacity: int = Field(ge=1)
    max_capacity: int = Field(ge=1)
    bedrooms: int = Field(0, ge=0)
    beds: int = Field(0, ge=0)
    bathrooms: int = Field(0, ge=0)
    area_m2: int | None = Field(None, gt=0)
    base_price_per_night: int = Field(gt=0, description="Rial")
    extra_guest_price: int = Field(0, ge=0)
    min_nights: int = Field(1, ge=1)
    check_in_time: time = time(14)
    check_out_time: time = time(12)
    house_rules: str | None = None
    status: AccommodationStatus = AccommodationStatus.draft
    amenity_ids: list[int] = []
    images: list[ImageIn] = []

    @model_validator(mode="after")
    def capacity(self):
        if self.max_capacity < self.base_capacity:
            raise ValueError("max_capacity must be >= base_capacity")
        return self


class AccommodationPatch(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    base_price_per_night: int | None = Field(None, gt=0)
    extra_guest_price: int | None = Field(None, ge=0)
    min_nights: int | None = Field(None, ge=1)
    house_rules: str | None = None
    status: AccommodationStatus | None = None
    amenity_ids: list[int] | None = None


def amenities_by_ids(db: Session, ids: list[int]) -> list[Amenity]:
    found = db.scalars(select(Amenity).where(Amenity.id.in_(ids))).all()
    if len(found) != len(set(ids)):
        raise HTTPException(422, "Unknown amenity id")
    return list(found)


@router.get("/accommodations", summary="All accommodations, any status")
def list_accommodations(db: Session = Depends(get_db)):
    return [acc_card(a) for a in db.scalars(select(Accommodation).order_by(Accommodation.id))]


@router.post("/accommodations", status_code=201, summary="Register an accommodation with amenities and images")
def create_accommodation(body: AccommodationIn, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude={"amenity_ids", "images"})
    a = Accommodation(**data, created_by=admin.id, amenities=amenities_by_ids(db, body.amenity_ids),
                      images=[AccommodationImage(url=i.url, is_cover=i.is_cover, sort_order=n)
                              for n, i in enumerate(body.images)])
    db.add(a)
    commit(db)
    return acc_card(a)


@router.patch("/accommodations/{acc_id}")
def update_accommodation(acc_id: int, body: AccommodationPatch, db: Session = Depends(get_db)):
    a = db.get(Accommodation, acc_id)
    if not a:
        raise HTTPException(404, "Accommodation not found")
    data = body.model_dump(exclude_unset=True)
    if "amenity_ids" in data:
        a.amenities = amenities_by_ids(db, data.pop("amenity_ids"))
    for k, v in data.items():
        setattr(a, k, v)
    commit(db)
    return acc_card(a)


class CalendarIn(BaseModel):
    start: date
    end: date = Field(description="exclusive")
    price_override: int | None = Field(None, gt=0)
    is_blocked: bool = False


@router.put("/accommodations/{acc_id}/calendar", summary="Set special price or block a date range")
def set_calendar(acc_id: int, body: CalendarIn, db: Session = Depends(get_db)):
    if not db.get(Accommodation, acc_id):
        raise HTTPException(404, "Accommodation not found")
    if body.end <= body.start:
        raise HTTPException(422, "end must be after start")
    for d in nights_between(body.start, body.end):
        db.merge(AccommodationCalendar(accommodation_id=acc_id, date=d, price_override=body.price_override,
                                       is_blocked=body.is_blocked))
    commit(db)
    return {"updated_days": (body.end - body.start).days}


# ---------- pricing rules & holidays ----------
class RuleIn(BaseModel):
    rule_type: PricingRuleType
    adjustment_type: AdjustmentType
    value: int = Field(description="positive = increase, negative = discount")
    start_date: date | None = None
    end_date: date | None = None
    min_nights: int | None = Field(None, ge=1)
    days_before_checkin: int | None = Field(None, ge=0)
    priority: int = 0
    is_active: bool = True

    @model_validator(mode="after")
    def required_fields(self):
        need = {PricingRuleType.season: ("start_date", "end_date"), PricingRuleType.long_stay: ("min_nights",),
                PricingRuleType.last_minute: ("days_before_checkin",),
                PricingRuleType.early_bird: ("days_before_checkin",)}.get(self.rule_type, ())
        if missing := [f for f in need if getattr(self, f) is None]:
            raise ValueError(f"{self.rule_type.value} rule needs {missing}")
        return self


def rule_out(r: PricingRule) -> dict:
    return {"id": r.id, "rule_type": r.rule_type, "adjustment_type": r.adjustment_type, "value": r.value,
            "start_date": r.start_date, "end_date": r.end_date, "min_nights": r.min_nights,
            "days_before_checkin": r.days_before_checkin, "priority": r.priority, "is_active": r.is_active}


@router.post("/accommodations/{acc_id}/pricing-rules", status_code=201)
def add_rule(acc_id: int, body: RuleIn, db: Session = Depends(get_db)):
    if not db.get(Accommodation, acc_id):
        raise HTTPException(404, "Accommodation not found")
    r = PricingRule(accommodation_id=acc_id, **body.model_dump())
    db.add(r)
    commit(db)
    return rule_out(r)


@router.get("/accommodations/{acc_id}/pricing-rules")
def list_rules(acc_id: int, db: Session = Depends(get_db)):
    return [rule_out(r) for r in db.scalars(select(PricingRule).where(PricingRule.accommodation_id == acc_id))]


@router.patch("/pricing-rules/{rule_id}", summary="Activate/deactivate a rule")
def toggle_rule(rule_id: int, is_active: bool, db: Session = Depends(get_db)):
    r = db.get(PricingRule, rule_id)
    if not r:
        raise HTTPException(404, "Rule not found")
    r.is_active = is_active  # rules are never deleted: booking_nights.pricing_rule_id points at them
    commit(db)
    return rule_out(r)


class HolidayIn(BaseModel):
    date: date
    title: str = Field(max_length=150)
    is_official: bool = True


@router.post("/holidays", status_code=201)
def add_holiday(body: HolidayIn, db: Session = Depends(get_db)):
    db.merge(Holiday(**body.model_dump()))
    commit(db)
    return body


@router.get("/holidays")
def list_holidays(db: Session = Depends(get_db)):
    return [{"date": h.date, "title": h.title, "is_official": h.is_official}
            for h in db.scalars(select(Holiday).order_by(Holiday.date))]


# ---------- points of interest ----------
class PoiIn(BaseModel):
    category_id: int
    city_id: int
    name: str = Field(max_length=200)
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
    description: str | None = None


@router.post("/points-of-interest", status_code=201)
def add_poi(body: PoiIn, db: Session = Depends(get_db)):
    p = PointOfInterest(**body.model_dump())
    db.add(p)
    commit(db)
    return {"id": p.id, "name": p.name}


# ---------- bookings & reviews ----------
@router.get("/bookings")
def all_bookings(status: BookingStatus | None = None, db: Session = Depends(get_db)):
    q = select(Booking).order_by(Booking.created_at.desc())
    if status:
        q = q.where(Booking.status == status)
    return [booking_out(b) for b in db.scalars(q)]


@router.post("/bookings/{booking_id}/complete", summary="Mark a confirmed stay as completed (enables review)")
def complete_booking(booking_id: int, db: Session = Depends(get_db)):
    b = db.get(Booking, booking_id)
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.status != BookingStatus.confirmed:
        raise HTTPException(409, f"Booking is {b.status.value}")
    b.status = BookingStatus.completed
    commit(db)
    return booking_out(b)


@router.get("/reviews")
def list_reviews(status: ReviewStatus = ReviewStatus.pending, db: Session = Depends(get_db)):
    return [{"id": r.id, "booking_id": r.booking_id, "accommodation_id": r.booking.accommodation_id,
             "rating": r.rating, "comment": r.comment, "status": r.status, "admin_reply": r.admin_reply}
            for r in db.scalars(select(Review).where(Review.status == status))]


class ReviewModerate(BaseModel):
    status: ReviewStatus
    admin_reply: str | None = None


@router.patch("/reviews/{review_id}", summary="Approve/reject a review and optionally reply")
def moderate(review_id: int, body: ReviewModerate, db: Session = Depends(get_db)):
    r = db.get(Review, review_id)
    if not r:
        raise HTTPException(404, "Review not found")
    r.status, r.admin_reply = body.status, body.admin_reply or r.admin_reply
    commit(db)
    return {"id": r.id, "status": r.status, "admin_reply": r.admin_reply}
