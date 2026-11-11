<div dir="rtl">

# بک‌اند سامانهٔ رزرو اقامتگاه

پیاده‌سازی بک‌اند روی همان ERD پروژهٔ قبل (۲۱ جدول و ۸ Enum در `../booking-erd.dbml`).

**پشتهٔ فنی:** Python 3.12، FastAPI، SQLAlchemy 2، PostgreSQL 16 و JWT. مستندات Swagger خودکار ساخته می‌شود.

## اجرا

**راه ساده (همه‌چیز با Docker):**
</div>

```bash
docker compose up --build
```

<div dir="rtl">

بعد Swagger را در آدرس http://localhost:8000/docs باز کن. دادهٔ نمونه موقع بالا آمدن خودکار ثبت می‌شود.

**راه توسعه (دیتابیس در Docker، API روی سیستم):**
</div>

```bash
docker compose up -d db
```

```bash
uv venv --python 3.12 .venv && uv pip install -p .venv -r requirements.txt
```

```bash
.venv/bin/python -m app.seed --reset && .venv/bin/uvicorn app.main:app --reload
```

<div dir="rtl">

**تست خودکار** (دیتابیس را پاک و دوباره پر می‌کند):
</div>

```bash
.venv/bin/python -m pytest -q tests
```

<div dir="rtl">

**Postman:** فایل `postman_collection.json` را Import کن و پوشه‌ها را به ترتیب اجرا کن، یا همه را یک‌جا با Newman:
</div>

```bash
npx -y newman run postman_collection.json
```

<div dir="rtl">

## ورود
۱. `POST /auth/otp/request` با شماره موبایل. در حالت توسعه کد در پاسخ برمی‌گردد (`debug_code`)، چون هنوز سرویس پیامک وصل نیست.
۲. `POST /auth/otp/verify` توکن JWT می‌دهد. در Swagger روی **Authorize** بزن و توکن را وارد کن.
- ادمین نمونه: `09120000000`. هر شمارهٔ دیگری با اولین ورود به‌عنوان مسافر ثبت‌نام می‌شود.

## اندپوینت‌ها

| گروه | اندپوینت | کار |
|---|---|---|
| Auth | `POST /auth/otp/request`، `POST /auth/otp/verify`، `GET/PATCH /auth/me` | ورود با کد یک‌بارمصرف و پروفایل |
| Catalog | `GET /catalog/provinces`، `cities`، `accommodation-types`، `amenities`، `poi-categories` | داده‌های پایه |
| Catalog | `GET /catalog/points-of-interest` | جاذبه‌ها، هر کدام با تعداد اقامتگاه‌های فعال در شعاع `radius_km` |
| Accommodations | `GET /accommodations` | جست‌وجو و فیلتر: شهر، استان، نوع، تاریخ آزاد، نفرات، امکانات، قیمت، **نزدیکی به جاذبه** (`near_poi_id`، `radius_km`، `sort=distance` با `distance_km` در پاسخ)، مرتب‌سازی و صفحه‌بندی |
| | `GET /accommodations/{id}` | جزئیات کامل، عکس‌ها، امکانات، میزبان، مختصات نقشه، میانگین امتیاز |
| | `GET /accommodations/{id}/quote` | قیمت هر شب و منبع آن (تقویم، قانون قیمت یا قیمت پایه) |
| | `GET /accommodations/{id}/calendar` | آزاد یا پر بودن و قیمت هر روز |
| | `GET /accommodations/{id}/nearby` | جاذبه‌های اطراف به ترتیب فاصله |
| | `GET /accommodations/{id}/reviews` | نظرهای تأییدشده |
| Bookings | `POST /bookings` | رزرو؛ تا ۱۵ دقیقه برای پرداخت نگه داشته می‌شود |
| | `GET /bookings/me`، `GET /bookings/{id}` | رزروهای من |
| | `POST /bookings/{id}/cancel` | لغو، آزاد کردن شب‌ها، بازگشت پول و رزرو خودکار نفر اول صف |
| | `POST /bookings/{id}/review` | نظر فقط برای اقامت تمام‌شده، یک نظر برای هر رزرو |
| Payments | `POST /payments/start`، `GET /payments/callback` | درگاه شبیه‌سازی‌شده (`status=OK` یا `NOK`) |
| Waitlist | `POST /waitlist`، `GET /waitlist/me`، `POST /waitlist/{id}/cancel` | صف انتظار با پیش‌پرداخت |
| Favorites | `GET /favorites`، `PUT/DELETE /favorites/{id}` | علاقه‌مندی‌ها |
| Admin | `/admin/hosts`، `/admin/accommodations`، `.../calendar`، `.../pricing-rules`، `/admin/holidays`، `/admin/points-of-interest`، `/admin/bookings`، `/admin/reviews` | ثبت اقامتگاه و میزبان، قیمت و بستن روزها، قانون قیمت، تعطیلات، تأیید نظرها |

## تصمیم‌های مهم پیاده‌سازی
- **رزرو تکراری در خود دیتابیس رد می‌شود.** هر شب رزرو یک ردیف در `booking_nights` است و کلید اصلی‌اش `(accommodation_id, night_date)` است. اگر دو نفر هم‌زمان یک شب را رزرو کنند، دیتابیس فقط یکی را قبول می‌کند و دیگری خطای 409 می‌گیرد. تست `test_concurrent_booking_same_night` این را با ۵ درخواست موازی نشان می‌دهد.
- **قیمت هر شب** به این ترتیب تعیین می‌شود: قیمت دستی ادمین در تقویم، بعد قانون فعالی که بالاترین `priority` را دارد (آخر هفته یعنی پنجشنبه و جمعه شب، تعطیلات، فصل، اقامت طولانی، لحظهٔ آخری، رزرو زودهنگام)، و در آخر قیمت پایه. هزینهٔ نفر اضافه روی همه جمع می‌شود. قیمت هر شب و شناسهٔ قانون اعمال‌شده در `booking_nights` ذخیره می‌شود.
- **رزرو پرداخت‌نشده** بعد از ۱۵ دقیقه `expired` می‌شود و شب‌هایش آزاد می‌شوند. اگر پول بعد از این مهلت برسد، خودکار برگشت می‌خورد.
- **صف انتظار:** مسافر برای تاریخ پر پیش‌پرداخت می‌کند. وقتی شب‌ها آزاد شوند (لغو یا انقضا)، قدیمی‌ترین درخواست پرداخت‌شده خودکار رزرو می‌شود. اگر تا روز ورود آزاد نشود، پولش برمی‌گردد.

## محدودیت‌های فعلی
- درگاه پرداخت و پیامک شبیه‌سازی شده‌اند.
- انقضای رزروها و صف موقع هر درخواست بررسی می‌شود، نه با یک کار زمان‌بندی‌شده.
- جدول‌ها با `create_all` ساخته می‌شوند و هنوز Migration (Alembic) نداریم.

</div>
