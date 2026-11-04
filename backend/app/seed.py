"""Seed demo data. `python -m app.seed` (skips if data exists) or `python -m app.seed --reset` (wipes the DB)."""
import sys
from datetime import date, time, timedelta

from sqlalchemy import select, text

from .db import Base, SessionLocal, engine
from .models import (Accommodation, AccommodationImage, AccommodationStatus, AccommodationType, AdjustmentType,
                     Amenity, City, Holiday, Host, PoiCategory, PointOfInterest, PricingRule, PricingRuleType,
                     Province, User, UserRole)

ADMIN_PHONE = "09120000000"


def run(reset: bool = False):
    if reset:
        with engine.begin() as c:
            c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.phone == ADMIN_PHONE)):
            print("seed: already seeded")
            return
        admin = User(phone=ADMIN_PHONE, first_name="مدیر", last_name="سامانه", role=UserRole.admin)
        maz, gil, teh = Province(name="مازندران"), Province(name="گیلان"), Province(name="تهران")
        ramsar, kelar = City(name="رامسر", province=maz), City(name="کلاردشت", province=maz)
        masuleh, tehran = City(name="ماسوله", province=gil), City(name="تهران", province=teh)
        villa, suite, cabin, apt = (AccommodationType(name=n, slug=s) for n, s in
                                    [("ویلا", "villa"), ("سوئیت", "suite"), ("کلبه", "cabin"), ("آپارتمان", "apartment")])
        pool, wifi, parking, bbq, ac = (Amenity(name=n, icon=i) for n, i in
                                        [("استخر", "pool"), ("وای‌فای", "wifi"), ("پارکینگ", "parking"),
                                         ("باربیکیو", "bbq"), ("کولر", "ac")])
        host1 = Host(full_name="رضا احمدی", phone="09111111111")
        host2 = Host(full_name="مریم کریمی", phone="09122222222")
        db.add_all([admin, ramsar, kelar, masuleh, tehran, villa, suite, cabin, apt, host1, host2])
        db.flush()

        def acc(**kw):
            return Accommodation(created_by=admin.id, status=AccommodationStatus.active, check_in_time=time(14),
                                 check_out_time=time(12), **kw)

        a1 = acc(host=host1, type=villa, city=ramsar, title="ویلای ساحلی رامسر", slug="ramsar-beach-villa",
                 description="ویلای دوبلکس با استخر و دید دریا", address="رامسر، بلوار ساحلی، کوچه ۱۲",
                 latitude=36.9031, longitude=50.6583, base_capacity=4, max_capacity=8, bedrooms=3, beds=4,
                 bathrooms=2, area_m2=220, base_price_per_night=40_000_000, extra_guest_price=3_000_000,
                 min_nights=1, house_rules="ورود حیوانات خانگی ممنوع", amenities=[pool, wifi, parking, bbq],
                 images=[AccommodationImage(url="https://picsum.photos/seed/ramsar1/800", is_cover=True),
                         AccommodationImage(url="https://picsum.photos/seed/ramsar2/800", sort_order=1)])
        a2 = acc(host=host2, type=cabin, city=kelar, title="کلبهٔ جنگلی کلاردشت", slug="kelardasht-forest-cabin",
                 description="کلبهٔ چوبی وسط جنگل", address="کلاردشت، جادهٔ حسن‌کیف",
                 latitude=36.4996, longitude=51.1573, base_capacity=2, max_capacity=4, bedrooms=1, beds=2,
                 bathrooms=1, area_m2=70, base_price_per_night=18_000_000, extra_guest_price=1_500_000,
                 min_nights=2, amenities=[wifi, parking, bbq],
                 images=[AccommodationImage(url="https://picsum.photos/seed/kelar/800", is_cover=True)])
        a3 = acc(host=host2, type=suite, city=masuleh, title="سوئیت سنتی ماسوله", slug="masuleh-suite",
                 address="ماسوله، محلهٔ کشه‌سر", latitude=37.1553, longitude=48.9870, base_capacity=2,
                 max_capacity=3, bedrooms=1, beds=1, bathrooms=1, base_price_per_night=9_000_000,
                 amenities=[wifi], images=[AccommodationImage(url="https://picsum.photos/seed/masuleh/800",
                                                              is_cover=True)])
        db.add_all([a1, a2, a3])
        db.flush()
        db.add_all([
            PricingRule(accommodation_id=a1.id, rule_type=PricingRuleType.weekend,
                        adjustment_type=AdjustmentType.percent, value=20, priority=10),
            PricingRule(accommodation_id=a1.id, rule_type=PricingRuleType.holiday,
                        adjustment_type=AdjustmentType.percent, value=50, priority=20),
            PricingRule(accommodation_id=a1.id, rule_type=PricingRuleType.long_stay,
                        adjustment_type=AdjustmentType.percent, value=-10, min_nights=7, priority=5),
            PricingRule(accommodation_id=a2.id, rule_type=PricingRuleType.last_minute,
                        adjustment_type=AdjustmentType.fixed, value=-3_000_000, days_before_checkin=2, priority=5),
        ])
        db.add_all([Holiday(date=date(2027, 3, 21), title="نوروز"), Holiday(date=date(2027, 3, 22), title="نوروز"),
                    Holiday(date=date.today() + timedelta(days=10), title="تعطیلی نمونه")])
        beach, food, hist = PoiCategory(name="ساحل"), PoiCategory(name="رستوران"), PoiCategory(name="جاذبهٔ تاریخی")
        db.add_all([
            PointOfInterest(category=beach, city=ramsar, name="ساحل رامسر", latitude=36.9120, longitude=50.6720),
            PointOfInterest(category=hist, city=ramsar, name="کاخ موزهٔ رامسر", latitude=36.9010, longitude=50.6620),
            PointOfInterest(category=food, city=ramsar, name="رستوران دریا", latitude=36.9070, longitude=50.6500),
            PointOfInterest(category=hist, city=masuleh, name="بافت تاریخی ماسوله", latitude=37.1550,
                            longitude=48.9865),
        ])
        db.commit()
        print("seed: done (admin phone", ADMIN_PHONE + ")")


if __name__ == "__main__":
    run(reset="--reset" in sys.argv)
