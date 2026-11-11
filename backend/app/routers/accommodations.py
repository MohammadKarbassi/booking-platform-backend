from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (Accommodation, AccommodationAmenity, AccommodationCalendar, AccommodationStatus, Booking,
                      BookingNight, PointOfInterest, Review, ReviewStatus)
from ..pricing import nights_between, quote
from ..serializers import acc_card, acc_detail
from ..services import sweep

router = APIRouter(prefix="/accommodations", tags=["Accommodations"])


def km_between(lat1, lon1, lat2, lon2):
    """Haversine distance in km as a SQL expression; distance is computed from coordinates, never stored."""
    la1, lo1, la2, lo2 = (func.radians(v) for v in (lat1, lon1, lat2, lon2))
    return 6371 * 2 * func.asin(func.sqrt(
        func.power(func.sin((la2 - la1) / 2), 2) + func.cos(la1) * func.cos(la2) * func.power(func.sin((lo2 - lo1) / 2), 2)))


def get_active(db: Session, acc_id: int) -> Accommodation:
    acc = db.get(Accommodation, acc_id)
    if not acc or acc.status != AccommodationStatus.active:
        raise HTTPException(404, "Accommodation not found")
    return acc


@router.get("", summary="Search & filter available accommodations")
def search(city_id: int | None = None, province_id: int | None = None, type_id: int | None = None,
           check_in: date | None = None, check_out: date | None = None, guests: int | None = Query(None, ge=1),
           amenity_ids: list[int] = Query([]), min_price: int | None = None, max_price: int | None = None,
           q: str | None = Query(None, description="Search in title"),
           near_poi_id: int | None = Query(None, description="Only stays around this point of interest"),
           radius_km: float = Query(30, gt=0, le=200, description="Used with near_poi_id"),
           sort: str = Query("newest", pattern="^(newest|price_asc|price_desc|distance)$"),
           page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    sweep(db)
    stmt = select(Accommodation).where(Accommodation.status == AccommodationStatus.active)
    if city_id:
        stmt = stmt.where(Accommodation.city_id == city_id)
    if province_id:
        stmt = stmt.where(Accommodation.city.has(province_id=province_id))
    if type_id:
        stmt = stmt.where(Accommodation.type_id == type_id)
    if guests:
        stmt = stmt.where(Accommodation.max_capacity >= guests)
    if min_price is not None:
        stmt = stmt.where(Accommodation.base_price_per_night >= min_price)
    if max_price is not None:
        stmt = stmt.where(Accommodation.base_price_per_night <= max_price)
    if q:
        stmt = stmt.where(Accommodation.title.ilike(f"%{q}%"))
    for am in amenity_ids:
        stmt = stmt.where(exists().where(AccommodationAmenity.accommodation_id == Accommodation.id,
                                         AccommodationAmenity.amenity_id == am))
    if check_in and check_out:
        if check_out <= check_in:
            raise HTTPException(422, "check_out must be after check_in")
        # free = no booked night and no blocked calendar day inside [check_in, check_out)
        stmt = stmt.where(
            ~exists().where(BookingNight.accommodation_id == Accommodation.id,
                            BookingNight.night_date >= check_in, BookingNight.night_date < check_out),
            ~exists().where(AccommodationCalendar.accommodation_id == Accommodation.id,
                            AccommodationCalendar.is_blocked, AccommodationCalendar.date >= check_in,
                            AccommodationCalendar.date < check_out),
            Accommodation.min_nights <= (check_out - check_in).days)
    dist = None
    if near_poi_id:
        poi = db.get(PointOfInterest, near_poi_id)
        if not poi:
            raise HTTPException(404, "Point of interest not found")
        dist = km_between(poi.latitude, poi.longitude, Accommodation.latitude, Accommodation.longitude)
        stmt = stmt.where(dist <= radius_km)
    elif sort == "distance":
        raise HTTPException(422, "sort=distance needs near_poi_id")
    order = {"newest": Accommodation.id.desc(), "price_asc": Accommodation.base_price_per_night,
             "price_desc": Accommodation.base_price_per_night.desc(), "distance": dist}[sort]
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    page_stmt = stmt.order_by(order).offset((page - 1) * size).limit(size)
    if dist is None:
        items = [acc_card(a) for a in db.scalars(page_stmt)]
    else:
        items = [{**acc_card(a), "distance_km": round(km, 2)} for a, km in db.execute(page_stmt.add_columns(dist))]
    return {"total": total, "page": page, "size": size, "items": items}


@router.get("/{acc_id}", summary="Full details: images, amenities, host, rules, rating, map location")
def detail(acc_id: int, db: Session = Depends(get_db)):
    a = get_active(db, acc_id)
    return acc_detail(a)


@router.get("/{acc_id}/reviews", summary="Approved reviews")
def reviews(acc_id: int, db: Session = Depends(get_db)):
    get_active(db, acc_id)
    rows = db.scalars(select(Review).join(Booking).where(Booking.accommodation_id == acc_id,
                                                         Review.status == ReviewStatus.approved)
                      .order_by(Review.created_at.desc()))
    return [{"id": r.id, "rating": r.rating, "comment": r.comment, "admin_reply": r.admin_reply,
             "guest": r.booking.user.first_name, "created_at": r.created_at} for r in rows]


@router.get("/{acc_id}/calendar", summary="Day-by-day availability and price")
def calendar(acc_id: int, start: date = Query(default_factory=date.today), days: int = Query(30, ge=1, le=90),
             db: Session = Depends(get_db)):
    sweep(db)
    a = get_active(db, acc_id)
    end = start + timedelta(days=days)
    booked = set(db.scalars(select(BookingNight.night_date).where(
        BookingNight.accommodation_id == acc_id, BookingNight.night_date >= start, BookingNight.night_date < end)))
    cal = {c.date: c for c in db.scalars(select(AccommodationCalendar).where(
        AccommodationCalendar.accommodation_id == acc_id, AccommodationCalendar.date >= start,
        AccommodationCalendar.date < end))}
    return [{"date": d, "available": d not in booked and not (d in cal and cal[d].is_blocked),
             "price": cal[d].price_override if d in cal and cal[d].price_override else a.base_price_per_night}
            for d in nights_between(start, end)]


@router.get("/{acc_id}/quote", summary="Price breakdown per night (calendar > pricing rule > base)")
def price_quote(acc_id: int, check_in: date, check_out: date, guests: int = Query(1, ge=1),
                db: Session = Depends(get_db)):
    return quote(db, get_active(db, acc_id), check_in, check_out, guests)


@router.get("/{acc_id}/nearby", summary="Points of interest around the accommodation")
def nearby(acc_id: int, radius_km: float = Query(10, gt=0, le=100), category_id: int | None = None,
           db: Session = Depends(get_db)):
    a = get_active(db, acc_id)
    # haversine in SQL; distance is computed from coordinates, never stored (ERD decision)
    lat1, lon1 = func.radians(a.latitude), func.radians(a.longitude)
    lat2, lon2 = func.radians(PointOfInterest.latitude), func.radians(PointOfInterest.longitude)
    dist = 6371 * 2 * func.asin(func.sqrt(
        func.power(func.sin((lat2 - lat1) / 2), 2) +
        func.cos(lat1) * func.cos(lat2) * func.power(func.sin((lon2 - lon1) / 2), 2))).label("km")
    stmt = select(PointOfInterest, dist).order_by(dist)
    if category_id:
        stmt = stmt.where(PointOfInterest.category_id == category_id)
    return [{"id": p.id, "name": p.name, "category": p.category.name, "distance_km": round(km, 2),
             "latitude": float(p.latitude), "longitude": float(p.longitude)}
            for p, km in db.execute(stmt) if km <= radius_km]
