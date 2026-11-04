"""Night price: 1) admin calendar override  2) highest-priority active rule  3) base price. Plus extra-guest fee."""
from datetime import date, timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (Accommodation, AccommodationCalendar, AdjustmentType, Holiday, PricingRule,
                     PricingRuleType as T)

IRAN_WEEKEND_NIGHTS = {3, 4}  # Thursday & Friday nights (Python weekday)


def nights_between(check_in: date, check_out: date) -> list[date]:
    return [check_in + timedelta(days=i) for i in range((check_out - check_in).days)]


def _rule_applies(r: PricingRule, night: date, n_nights: int, lead_days: int, holidays: set[date]) -> bool:
    match r.rule_type:
        case T.weekend:
            return night.weekday() in IRAN_WEEKEND_NIGHTS
        case T.holiday:
            return night in holidays
        case T.season:
            return bool(r.start_date and r.end_date and r.start_date <= night <= r.end_date)
        case T.long_stay:
            return r.min_nights is not None and n_nights >= r.min_nights
        case T.last_minute:
            return r.days_before_checkin is not None and lead_days <= r.days_before_checkin
        case T.early_bird:
            return r.days_before_checkin is not None and lead_days >= r.days_before_checkin
    return False


def quote(db: Session, acc: Accommodation, check_in: date, check_out: date, guests: int) -> dict:
    if check_out <= check_in:
        raise HTTPException(422, "check_out must be after check_in")
    if check_in < date.today():
        raise HTTPException(422, "check_in is in the past")
    nights = nights_between(check_in, check_out)
    if len(nights) < acc.min_nights:
        raise HTTPException(422, f"Minimum stay is {acc.min_nights} nights")
    if not 1 <= guests <= acc.max_capacity:
        raise HTTPException(422, f"Guests must be between 1 and {acc.max_capacity}")

    cal = {c.date: c for c in db.scalars(select(AccommodationCalendar).where(
        AccommodationCalendar.accommodation_id == acc.id, AccommodationCalendar.date.in_(nights)))}
    blocked = [d for d, c in cal.items() if c.is_blocked]
    if blocked:
        raise HTTPException(409, f"Blocked dates: {sorted(blocked)}")
    holidays = set(db.scalars(select(Holiday.date).where(Holiday.date.in_(nights))))
    rules = sorted((r for r in acc.pricing_rules if r.is_active), key=lambda r: -r.priority)
    lead_days = (check_in - date.today()).days
    extra = max(0, guests - acc.base_capacity) * acc.extra_guest_price

    breakdown = []
    for night in nights:
        rule = None
        if night in cal and cal[night].price_override is not None:
            price, source = cal[night].price_override, "calendar"
        else:
            rule = next((r for r in rules if _rule_applies(r, night, len(nights), lead_days, holidays)), None)
            base = acc.base_price_per_night
            if rule is None:
                price, source = base, "base"
            else:
                delta = base * rule.value // 100 if rule.adjustment_type == AdjustmentType.percent else rule.value
                price, source = max(0, base + delta), rule.rule_type.value
        breakdown.append({"night": night, "price": price + extra, "source": source,
                          "pricing_rule_id": rule.id if rule else None})
    return {"nights": len(nights), "extra_guest_fee_per_night": extra,
            "total_price": sum(b["price"] for b in breakdown), "breakdown": breakdown}
