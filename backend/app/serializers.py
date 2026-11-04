from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Accommodation, Booking, Review, ReviewStatus


def rating_of(db: Session, acc_id: int) -> dict:
    avg, count = db.execute(select(func.avg(Review.rating), func.count()).join(Booking).where(
        Booking.accommodation_id == acc_id, Review.status == ReviewStatus.approved)).one()
    return {"average": round(float(avg), 2) if avg else None, "count": count}


def acc_card(a: Accommodation) -> dict:
    cover = next((i.url for i in a.images if i.is_cover), a.images[0].url if a.images else None)
    return {"id": a.id, "title": a.title, "slug": a.slug, "type": a.type.name, "city": a.city.name,
            "province": a.city.province.name, "base_price_per_night": a.base_price_per_night,
            "max_capacity": a.max_capacity, "bedrooms": a.bedrooms, "cover_image": cover,
            "latitude": float(a.latitude), "longitude": float(a.longitude), "status": a.status}


def booking_out(b: Booking) -> dict:
    return {"id": b.id, "booking_code": b.booking_code, "accommodation_id": b.accommodation_id,
            "accommodation_title": b.accommodation.title, "check_in": b.check_in, "check_out": b.check_out,
            "guests_count": b.guests_count, "total_price": b.total_price, "status": b.status,
            "expires_at": b.expires_at, "cancelled_at": b.cancelled_at, "created_at": b.created_at,
            "nights": [{"night": n.night_date, "price": n.price, "pricing_rule_id": n.pricing_rule_id}
                       for n in b.nights],
            "payments": [{"id": p.id, "amount": p.amount, "status": p.status, "ref_id": p.ref_id}
                         for p in b.payments]}
