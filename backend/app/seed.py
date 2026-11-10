"""Seed demo data. `python -m app.seed` (skips if data exists) or `python -m app.seed --reset` (wipes the DB).

Images live in the frontend (`frontend/public/stays`, credits in CREDITS.md); the DB stores their site paths.
Test contract (tests/test_flow.py): the Ramsar villa keeps exactly 3 points of interest within 5 km and no reviews.
"""
import sys
from datetime import date, time, timedelta

from sqlalchemy import select, text

from .db import Base, SessionLocal, engine
from .models import (Accommodation, AccommodationImage, AccommodationStatus, AccommodationType, AdjustmentType,
                     Amenity, Booking, BookingNight, BookingStatus, City, Holiday, Host, PoiCategory,
                     PointOfInterest, PricingRule, PricingRuleType, Province, Review, ReviewStatus, User, UserRole)

ADMIN_PHONE = "09120000000"
DEMO_GUEST_PHONE = "09125555555"


def imgs(*names: str) -> list[AccommodationImage]:
    return [AccommodationImage(url=f"/stays/{n}.jpg", is_cover=i == 0, sort_order=i) for i, n in enumerate(names)]


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
        guests = [User(phone=DEMO_GUEST_PHONE, first_name="سارا", last_name="رحیمی"),
                  User(phone="09126666666", first_name="امید", last_name="نوری"),
                  User(phone="09127777777", first_name="نگار", last_name="صادقی")]

        provinces = {n: Province(name=n) for n in ["مازندران", "گیلان", "تهران", "اصفهان", "یزد", "فارس", "هرمزگان",
                                                  "آذربایجان شرقی"]}
        city_specs = [("رامسر", "مازندران"), ("کلاردشت", "مازندران"), ("فیلبند", "مازندران"), ("ماسوله", "گیلان"),
                      ("تهران", "تهران"), ("اصفهان", "اصفهان"), ("کاشان", "اصفهان"), ("ابیانه", "اصفهان"),
                      ("یزد", "یزد"), ("شیراز", "فارس"), ("قشم", "هرمزگان"), ("کندوان", "آذربایجان شرقی")]
        city = {n: City(name=n, province=provinces[p]) for n, p in city_specs}

        villa, suite, cabin, apt, eco = (AccommodationType(name=n, slug=s) for n, s in
                                         [("ویلا", "villa"), ("سوئیت", "suite"), ("کلبه", "cabin"),
                                          ("آپارتمان", "apartment"), ("بوم‌گردی", "eco-lodge")])
        am = {i: Amenity(name=n, icon=i) for n, i in
              [("استخر", "pool"), ("وای‌فای", "wifi"), ("پارکینگ", "parking"), ("باربیکیو", "bbq"), ("کولر", "ac"),
               ("آشپزخانه", "kitchen"), ("شومینه", "fireplace"), ("صبحانهٔ محلی", "breakfast"),
               ("بخاری", "heating"), ("حیاط", "yard")]}
        host1 = Host(full_name="رضا احمدی", phone="09111111111")
        host2 = Host(full_name="مریم کریمی", phone="09122222222")
        host3 = Host(full_name="حسین یزدانی", phone="09133333333")
        host4 = Host(full_name="فاطمه بندری", phone="09144444444")
        db.add_all([admin, *guests, *city.values(), villa, suite, cabin, apt, eco, *am.values(),
                    host1, host2, host3, host4])
        db.flush()

        def acc(**kw):
            kw.setdefault("check_in_time", time(14))
            kw.setdefault("check_out_time", time(12))
            return Accommodation(created_by=admin.id, status=AccommodationStatus.active, **kw)

        a1 = acc(host=host1, type=villa, city=city["رامسر"], title="ویلای ساحلی رامسر", slug="ramsar-beach-villa",
                 description="ویلای دوبلکس با استخر و دید مستقیم به خزر. صبح با صدای موج بیدار می‌شوی و تا ساحل "
                             "پنج دقیقه پیاده‌روی است.",
                 address="رامسر، بلوار ساحلی، کوچه ۱۲", latitude=36.9031, longitude=50.6583, base_capacity=4,
                 max_capacity=8, bedrooms=3, beds=4, bathrooms=2, area_m2=220, base_price_per_night=40_000_000,
                 extra_guest_price=3_000_000, min_nights=1, house_rules="ورود حیوانات خانگی ممنوع",
                 amenities=[am["pool"], am["wifi"], am["parking"], am["bbq"]], images=imgs("ramsar", "ramsar2"))
        a2 = acc(host=host2, type=cabin, city=city["کلاردشت"], title="کلبهٔ جنگلی کلاردشت",
                 slug="kelardasht-forest-cabin",
                 description="کلبهٔ چوبی وسط جنگل‌های هیرکانی، با شومینه و ایوانی رو به مه صبحگاهی. "
                             "تا دریاچهٔ ولشت راه زیادی نیست.",
                 address="کلاردشت، جادهٔ حسن‌کیف", latitude=36.4996, longitude=51.1573, base_capacity=2,
                 max_capacity=4, bedrooms=1, beds=2, bathrooms=1, area_m2=70, base_price_per_night=18_000_000,
                 extra_guest_price=1_500_000, min_nights=2,
                 amenities=[am["wifi"], am["parking"], am["bbq"], am["fireplace"]],
                 images=imgs("kelardasht", "kelardasht2"))
        a3 = acc(host=host2, type=suite, city=city["ماسوله"], title="سوئیت سنتی ماسوله", slug="masuleh-suite",
                 description="اتاقی در دل روستای پلکانی؛ پشت‌بام همسایه، حیاط توست. چای را روی ایوان چوبی بخور و "
                             "مه را تماشا کن که از دره بالا می‌آید.",
                 address="ماسوله، محلهٔ کشه‌سر", latitude=37.1553, longitude=48.9870, base_capacity=2,
                 max_capacity=3, bedrooms=1, beds=1, bathrooms=1, area_m2=40, base_price_per_night=9_000_000,
                 amenities=[am["wifi"], am["heating"], am["breakfast"]], images=imgs("masuleh", "masuleh2"))
        others = [
            acc(host=host3, type=eco, city=city["کندوان"], title="خانهٔ صخره‌ای کندوان", slug="kandovan-rock-house",
                description="شب را درون یک کَران آتشفشانی بگذران؛ خانه‌ای که هفتصد سال پیش در دل سنگ کنده شده و "
                            "تابستان خنک و زمستان گرم است.",
                address="کندوان، محلهٔ بالا", latitude=37.7945, longitude=46.2489, base_capacity=2,
                max_capacity=4, bedrooms=1, beds=2, bathrooms=1, area_m2=45, base_price_per_night=12_000_000,
                extra_guest_price=1_000_000, house_rules="کفش‌ها را دم در بیرون بیاورید",
                amenities=[am["heating"], am["breakfast"]], images=imgs("kandovan", "kandovan2")),
            acc(host=host3, type=eco, city=city["یزد"], title="خانهٔ بادگیر یزد", slug="yazd-windcatcher-house",
                description="خانهٔ خشتی با حیاط مرکزی، حوض فیروزه‌ای و بادگیری که هنوز کار می‌کند. پشت‌بام را برای "
                            "تماشای ستاره‌های کویر از دست نده.",
                address="یزد، محلهٔ فهادان", latitude=31.9010, longitude=54.3720, base_capacity=4,
                max_capacity=6, bedrooms=3, beds=4, bathrooms=2, area_m2=180, base_price_per_night=16_000_000,
                extra_guest_price=1_200_000, check_in_time=time(15),
                amenities=[am["wifi"], am["ac"], am["breakfast"], am["yard"]], images=imgs("yazd", "yazd2")),
            acc(host=host3, type=eco, city=city["کاشان"], title="عمارت شاه‌نشین کاشان", slug="kashan-mansion",
                description="اتاق‌های گوشواره‌ای یک عمارت قاجاری با ارسی‌های رنگی. نور صبح از شیشه‌ها روی فرش "
                            "می‌ریزد.",
                address="کاشان، محلهٔ سلطان امیر احمد", latitude=33.9789, longitude=51.4440, base_capacity=2,
                max_capacity=4, bedrooms=2, beds=2, bathrooms=1, area_m2=90, base_price_per_night=14_000_000,
                extra_guest_price=1_000_000,
                amenities=[am["wifi"], am["ac"], am["breakfast"], am["yard"]], images=imgs("kashan", "kashan2")),
            acc(host=host4, type=eco, city=city["قشم"], title="کپر ساحلی قشم", slug="qeshm-beach-hut",
                description="کپر بومی کنار دریای خلیج فارس، چند دقیقه تا درهٔ ستاره‌ها. شام ماهی محلی با دست "
                            "میزبان پخته می‌شود.",
                address="قشم، روستای برکه خلف", latitude=26.8600, longitude=55.8600, base_capacity=2,
                max_capacity=5, bedrooms=1, beds=3, bathrooms=1, area_m2=50, base_price_per_night=8_000_000,
                extra_guest_price=800_000, amenities=[am["ac"], am["breakfast"], am["parking"]],
                images=imgs("qeshm", "qeshm2")),
            acc(host=host1, type=apt, city=city["اصفهان"], title="آپارتمان نقش جهان", slug="isfahan-naqsh-apartment",
                description="آپارتمانی دنج سه کوچه آن‌طرف‌تر از میدان نقش جهان. عصر پیاده تا سی‌وسه‌پل برو و شب "
                            "برگرد.",
                address="اصفهان، خیابان حافظ", latitude=32.6610, longitude=51.6740, base_capacity=3,
                max_capacity=5, bedrooms=2, beds=3, bathrooms=1, area_m2=95, base_price_per_night=20_000_000,
                extra_guest_price=1_500_000, amenities=[am["wifi"], am["ac"], am["kitchen"], am["parking"]],
                images=imgs("isfahan", "isfahan2")),
            acc(host=host4, type=suite, city=city["شیراز"], title="باغ‌سرای شیراز", slug="shiraz-garden-suite",
                description="سوئیتی در باغی پر از نارنج، نزدیک باغ ارم. بهار که بیایی، بوی بهارنارنج تا "
                            "اتاق می‌آید.",
                address="شیراز، خیابان ارم", latitude=29.6380, longitude=52.5200, base_capacity=2,
                max_capacity=3, bedrooms=1, beds=1, bathrooms=1, area_m2=55, base_price_per_night=15_000_000,
                extra_guest_price=1_000_000, amenities=[am["wifi"], am["ac"], am["yard"], am["breakfast"]],
                images=imgs("shiraz")),
            acc(host=host1, type=cabin, city=city["فیلبند"], title="کلبهٔ دریای ابر فیلبند",
                slug="filband-cloud-cabin",
                description="بالاتر از ابرها؛ صبح‌ها از پنجره دریای ابر را می‌بینی که دره را پر کرده است.",
                address="فیلبند، جادهٔ ییلاقی", latitude=36.0270, longitude=52.7050, base_capacity=2,
                max_capacity=4, bedrooms=1, beds=2, bathrooms=1, area_m2=60, base_price_per_night=13_000_000,
                extra_guest_price=1_000_000, min_nights=2,
                amenities=[am["heating"], am["fireplace"], am["parking"]], images=imgs("filband")),
            acc(host=host2, type=eco, city=city["ابیانه"], title="اقامتگاه سرخ ابیانه", slug="abyaneh-red-lodge",
                description="خانه‌ای با دیوارهای گلی سرخ در روستای هزارساله. اهالی هنوز به گویش پارتی حرف "
                            "می‌زنند.",
                address="ابیانه، محلهٔ یالان", latitude=33.5770, longitude=51.6030, base_capacity=2,
                max_capacity=4, bedrooms=2, beds=2, bathrooms=1, area_m2=70, base_price_per_night=11_000_000,
                extra_guest_price=900_000, amenities=[am["heating"], am["breakfast"], am["yard"]],
                images=imgs("abyaneh")),
            acc(host=host4, type=apt, city=city["تهران"], title="آپارتمان دامنهٔ توچال", slug="tehran-tochal-flat",
                description="طبقهٔ آخر با پنجره‌ای رو به توچال. صبح تله‌کابین، عصر دربند و شب چراغ‌های شهر.",
                address="تهران، ولنجک", latitude=35.8000, longitude=51.4000, base_capacity=2,
                max_capacity=4, bedrooms=2, beds=2, bathrooms=2, area_m2=110, base_price_per_night=25_000_000,
                extra_guest_price=2_000_000, amenities=[am["wifi"], am["ac"], am["kitchen"], am["parking"]],
                images=imgs("tochal")),
        ]
        db.add_all([a1, a2, a3, *others])
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
            *[PricingRule(accommodation_id=a.id, rule_type=PricingRuleType.weekend,
                          adjustment_type=AdjustmentType.percent, value=15, priority=10) for a in others],
        ])
        db.add_all([Holiday(date=date(2027, 3, 21), title="نوروز"), Holiday(date=date(2027, 3, 22), title="نوروز"),
                    Holiday(date=date.today() + timedelta(days=10), title="تعطیلی نمونه")])

        cat = {n: PoiCategory(name=n) for n in ["ساحل", "رستوران", "جاذبهٔ تاریخی", "طبیعت", "بازار", "موزه"]}
        pois = [  # (category, city, name, lat, lon)
            ("ساحل", "رامسر", "ساحل رامسر", 36.9120, 50.6720),
            ("جاذبهٔ تاریخی", "رامسر", "کاخ موزهٔ رامسر", 36.9010, 50.6620),
            ("رستوران", "رامسر", "رستوران دریا", 36.9070, 50.6500),
            ("طبیعت", "رامسر", "روستای ییلاقی جواهرده", 36.8560, 50.4880),  # >5 km: keeps the test's 3
            ("طبیعت", "کلاردشت", "دریاچهٔ ولشت", 36.5440, 51.2880),
            ("طبیعت", "کلاردشت", "جنگل رودبارک", 36.4780, 51.1150),
            ("بازار", "کلاردشت", "بازار محلی حسن‌کیف", 36.5050, 51.1700),
            ("طبیعت", "فیلبند", "دریای ابر فیلبند", 36.0300, 52.7100),
            ("طبیعت", "فیلبند", "آبشار ورسک کوهستان", 36.0450, 52.6600),
            ("جاذبهٔ تاریخی", "ماسوله", "بافت تاریخی ماسوله", 37.1550, 48.9865),
            ("طبیعت", "ماسوله", "آبشار ماسوله", 37.1600, 48.9780),
            ("بازار", "ماسوله", "بازارچهٔ پلکانی", 37.1545, 48.9880),
            ("جاذبهٔ تاریخی", "ماسوله", "قلعهٔ رودخان", 37.0630, 49.2400),
            ("جاذبهٔ تاریخی", "کندوان", "کَران‌های صخره‌ای", 37.7950, 46.2480),
            ("طبیعت", "کندوان", "چشمهٔ آب معدنی کندوان", 37.7930, 46.2470),
            ("طبیعت", "کندوان", "دامنهٔ سهند", 37.7440, 46.3800),
            ("جاذبهٔ تاریخی", "یزد", "مسجد جامع یزد", 31.9015, 54.3687),
            ("جاذبهٔ تاریخی", "یزد", "باغ دولت‌آباد", 31.9030, 54.3510),
            ("موزه", "یزد", "زندان اسکندر", 31.8990, 54.3710),
            ("بازار", "یزد", "بازار خان", 31.8970, 54.3660),
            ("رستوران", "یزد", "سفره‌خانهٔ ملک‌التجار", 31.8975, 54.3655),
            ("جاذبهٔ تاریخی", "کاشان", "باغ فین", 33.9447, 51.3755),
            ("موزه", "کاشان", "خانهٔ طباطبایی‌ها", 33.9760, 51.4410),
            ("جاذبهٔ تاریخی", "کاشان", "حمام سلطان امیر احمد", 33.9757, 51.4433),
            ("بازار", "کاشان", "بازار کاشان", 33.9840, 51.4390),
            ("طبیعت", "قشم", "درهٔ ستاره‌ها", 26.8540, 55.8740),
            ("طبیعت", "قشم", "جنگل حرا", 26.8500, 55.7300),
            ("ساحل", "قشم", "ساحل برکه خلف", 26.8650, 55.8550),
            ("طبیعت", "قشم", "غار نمکدان", 26.6380, 55.5000),
            ("جاذبهٔ تاریخی", "اصفهان", "میدان نقش جهان", 32.6575, 51.6776),
            ("جاذبهٔ تاریخی", "اصفهان", "سی‌وسه‌پل", 32.6440, 51.6670),
            ("بازار", "اصفهان", "بازار قیصریه", 32.6615, 51.6782),
            ("موزه", "اصفهان", "کاخ چهلستون", 32.6573, 51.6720),
            ("جاذبهٔ تاریخی", "شیراز", "باغ ارم", 29.6360, 52.5250),
            ("جاذبهٔ تاریخی", "شیراز", "حافظیه", 29.6250, 52.5580),
            ("جاذبهٔ تاریخی", "شیراز", "مسجد نصیرالملک", 29.6080, 52.5480),
            ("بازار", "شیراز", "بازار وکیل", 29.6160, 52.5410),
            ("جاذبهٔ تاریخی", "ابیانه", "بافت تاریخی ابیانه", 33.5780, 51.6040),
            ("جاذبهٔ تاریخی", "ابیانه", "آتشکدهٔ هرپاک", 33.5800, 51.6060),
            ("طبیعت", "تهران", "تله‌کابین توچال", 35.8070, 51.3960),
            ("طبیعت", "تهران", "دربند", 35.8180, 51.4240),
            ("موزه", "تهران", "کاخ سعدآباد", 35.8230, 51.4210),
            ("جاذبهٔ تاریخی", "تهران", "برج میلاد", 35.7448, 51.3753),
        ]
        db.add_all(PointOfInterest(category=cat[c], city=city[ci], name=n, latitude=la, longitude=lo)
                   for c, ci, n, la, lo in pois)

        # finished stays with approved reviews, so ratings show up (never on the Ramsar villa: see test contract)
        db.flush()
        stays = [(others[1], guests[0], 5, "حیاط و حوضش رؤیایی بود. شب‌ها روی پشت‌بام ستاره شمردیم.",
                  "خوشحالیم که به شما خوش گذشت!"),
                 (others[1], guests[1], 4, "خانه تمیز و میزبان خیلی مهربان بود. صبحانه عالی.", None),
                 (a3, guests[2], 5, "از ایوان، مه را تماشا کردیم که از دره بالا می‌آمد. تکرارنشدنی.", None),
                 (others[0], guests[0], 5, "خوابیدن داخل صخره تجربهٔ عجیب و قشنگی بود.", None),
                 (a2, guests[1], 4, "کلبه گرم و دنج بود؛ جاده کمی خاکی است.", "ممنون از نظرتان، جاده را "
                                                                             "داریم درست می‌کنیم."),
                 (others[2], guests[2], 5, "ارسی‌ها و نور صبح را هیچ‌وقت فراموش نمی‌کنم.", None),
                 (others[3], guests[1], 4, "شام ماهی میزبان عالی بود. هوا خیلی گرم است، تابستان نروید.",
                  None)]
        for n, (a, u, rating, comment, reply) in enumerate(stays):
            ci = date.today() - timedelta(days=60 + n * 9)
            nights = [ci + timedelta(days=i) for i in range(max(2, a.min_nights))]
            total = a.base_price_per_night * len(nights)
            b = Booking(booking_code=f"BKDEMO{n:02d}", user_id=u.id, accommodation_id=a.id, check_in=ci,
                        check_out=ci + timedelta(days=len(nights)), guests_count=2, total_price=total,
                        status=BookingStatus.completed)
            db.add(b)
            db.flush()
            db.add_all(BookingNight(booking_id=b.id, accommodation_id=a.id, night_date=d,
                                    price=a.base_price_per_night) for d in nights)
            db.add(Review(booking_id=b.id, rating=rating, comment=comment, status=ReviewStatus.approved,
                          admin_reply=reply))
        db.commit()
        print("seed: done (admin phone", ADMIN_PHONE + ", demo guest", DEMO_GUEST_PHONE + ")")


if __name__ == "__main__":
    run(reset="--reset" in sys.argv)
