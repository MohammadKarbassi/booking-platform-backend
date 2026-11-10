from sqlalchemy import func, select
from sqlalchemy.orm import Session, object_session

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
            "latitude": float(a.latitude), "longitude": float(a.longitude), "status": a.status,
            "rating": rating_of(object_session(a), a.id)}


def acc_detail(a: Accommodation) -> dict:
    return {**acc_card(a), "description": a.description, "address": a.address,
            "base_capacity": a.base_capacity, "beds": a.beds, "bathrooms": a.bathrooms, "area_m2": a.area_m2,
            "extra_guest_price": a.extra_guest_price, "min_nights": a.min_nights,
            "check_in_time": a.check_in_time, "check_out_time": a.check_out_time, "house_rules": a.house_rules,
            "host": {"id": a.host.id, "full_name": a.host.full_name},
            "images": [{"url": i.url, "is_cover": i.is_cover} for i in a.images],
            "amenities": [{"id": m.id, "name": m.name, "icon": m.icon} for m in a.amenities]}


def booking_out(b: Booking) -> dict:
    acc, u = b.accommodation, b.user
    return {"cover_image": acc_card(acc)["cover_image"], "city": acc.city.name,
            "guest": {"phone": u.phone, "name": " ".join(filter(None, [u.first_name, u.last_name])) or None},
            "review": {"rating": b.review.rating, "status": b.review.status} if b.review else None,
            "id": b.id, "booking_code": b.booking_code, "accommodation_id": b.accommodation_id,
            "accommodation_title": b.accommodation.title, "check_in": b.check_in, "check_out": b.check_out,
            "guests_count": b.guests_count, "total_price": b.total_price, "status": b.status,
            "expires_at": b.expires_at, "cancelled_at": b.cancelled_at, "created_at": b.created_at,
            "nights": [{"night": n.night_date, "price": n.price, "pricing_rule_id": n.pricing_rule_id}
                       for n in b.nights],
            "payments": [{"id": p.id, "amount": p.amount, "status": p.status, "ref_id": p.ref_id}
                         for p in b.payments]}
