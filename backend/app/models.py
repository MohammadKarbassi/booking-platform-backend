"""ORM models — one class per table of booking-erd.dbml (21 tables, 8 enums)."""
import enum
import re
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import (BigInteger, Boolean, CheckConstraint, Date, DateTime, Enum, ForeignKey,
                        ForeignKeyConstraint, Index, Integer, Numeric, SmallInteger, String, Text, Time,
                        func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _enum(e):
    return Enum(e, name=re.sub(r"(?<!^)(?=[A-Z])", "_", e.__name__).lower(), values_callable=lambda x: [m.value for m in x])


class UserRole(str, enum.Enum):
    guest = "guest"
    admin = "admin"


class AccommodationStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    inactive = "inactive"


class BookingStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    confirmed = "confirmed"
    cancelled = "cancelled"
    expired = "expired"
    completed = "completed"


class PaymentStatus(str, enum.Enum):
    initiated = "initiated"
    success = "success"
    failed = "failed"
    refunded = "refunded"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class WaitlistStatus(str, enum.Enum):
    waiting = "waiting"
    fulfilled = "fulfilled"
    expired = "expired"
    cancelled = "cancelled"


class PricingRuleType(str, enum.Enum):
    weekend = "weekend"
    holiday = "holiday"
    season = "season"
    long_stay = "long_stay"
    last_minute = "last_minute"
    early_bird = "early_bird"


class AdjustmentType(str, enum.Enum):
    percent = "percent"
    fixed = "fixed"




# ---------- users & auth ----------
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    phone: Mapped[str] = mapped_column(String(15), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[UserRole] = mapped_column(_enum(UserRole), default=UserRole.guest)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=datetime.now)

    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")


class OtpCode(Base):
    __tablename__ = "otp_codes"
    __table_args__ = (Index(None, "phone", "created_at"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    phone: Mapped[str] = mapped_column(String(15))
    code_hash: Mapped[str] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


# ---------- geography ----------
class Province(Base):
    __tablename__ = "provinces"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    cities: Mapped[list["City"]] = relationship(back_populates="province")


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (Index(None, "province_id", "name", unique=True),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    province_id: Mapped[int] = mapped_column(ForeignKey("provinces.id"))
    name: Mapped[str] = mapped_column(String(100))
    province: Mapped[Province] = relationship(back_populates="cities")


# ---------- catalog ----------
class AccommodationType(Base):
    __tablename__ = "accommodation_types"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True)


class Host(Base):
    __tablename__ = "hosts"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), unique=True)  # NULL in phase 1
    full_name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str] = mapped_column(String(15))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class AccommodationAmenity(Base):
    __tablename__ = "accommodation_amenities"
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id", ondelete="CASCADE"), primary_key=True)
    amenity_id: Mapped[int] = mapped_column(ForeignKey("amenities.id"), primary_key=True)


class Amenity(Base):
    __tablename__ = "amenities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    icon: Mapped[str | None] = mapped_column(String(100))


class Accommodation(Base):
    __tablename__ = "accommodations"
    __table_args__ = (
        CheckConstraint("max_capacity >= base_capacity", name="ck_capacity"),
        Index(None, "city_id", "type_id", "status"),
        Index(None, "latitude", "longitude"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("hosts.id"))
    type_id: Mapped[int] = mapped_column(ForeignKey("accommodation_types.id"))
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))  # admin who registered it
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(220), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str] = mapped_column(Text)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    base_capacity: Mapped[int] = mapped_column(SmallInteger)
    max_capacity: Mapped[int] = mapped_column(SmallInteger)
    bedrooms: Mapped[int] = mapped_column(SmallInteger, default=0)
    beds: Mapped[int] = mapped_column(SmallInteger, default=0)
    bathrooms: Mapped[int] = mapped_column(SmallInteger, default=0)
    area_m2: Mapped[int | None] = mapped_column(Integer)
    base_price_per_night: Mapped[int] = mapped_column(BigInteger)  # Rial
    extra_guest_price: Mapped[int] = mapped_column(BigInteger, default=0)
    min_nights: Mapped[int] = mapped_column(SmallInteger, default=1)
    check_in_time: Mapped[time] = mapped_column(Time)
    check_out_time: Mapped[time] = mapped_column(Time)
    house_rules: Mapped[str | None] = mapped_column(Text)
    status: Mapped[AccommodationStatus] = mapped_column(_enum(AccommodationStatus), default=AccommodationStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=datetime.now)

    host: Mapped[Host] = relationship()
    type: Mapped[AccommodationType] = relationship()
    city: Mapped[City] = relationship()
    images: Mapped[list["AccommodationImage"]] = relationship(order_by="AccommodationImage.sort_order",
                                                              cascade="all, delete-orphan")
    amenities: Mapped[list[Amenity]] = relationship(secondary="accommodation_amenities")
    pricing_rules: Mapped[list["PricingRule"]] = relationship(back_populates="accommodation")


class AccommodationImage(Base):
    __tablename__ = "accommodation_images"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id"))
    url: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)


class AccommodationCalendar(Base):
    __tablename__ = "accommodation_calendar"
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id"), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    price_override: Mapped[int | None] = mapped_column(BigInteger)  # NULL = base price
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)


# ---------- booking & payment ----------
class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_booking_dates"),
        Index(None, "id", "accommodation_id", unique=True),  # target of booking_nights composite FK
        Index(None, "user_id"),
        Index(None, "accommodation_id", "check_in"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_code: Mapped[str] = mapped_column(String(20), unique=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id"))
    check_in: Mapped[date] = mapped_column(Date)
    check_out: Mapped[date] = mapped_column(Date)
    guests_count: Mapped[int] = mapped_column(SmallInteger)
    total_price: Mapped[int] = mapped_column(BigInteger)  # snapshot at booking time
    status: Mapped[BookingStatus] = mapped_column(_enum(BookingStatus), default=BookingStatus.pending_payment)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    user: Mapped[User] = relationship(back_populates="bookings")
    accommodation: Mapped[Accommodation] = relationship()
    nights: Mapped[list["BookingNight"]] = relationship(cascade="all, delete-orphan", order_by="BookingNight.night_date",
                                                        overlaps="accommodation")
    payments: Mapped[list["Payment"]] = relationship(back_populates="booking")
    review: Mapped["Review | None"] = relationship(back_populates="booking")


class BookingNight(Base):
    """PK (accommodation_id, night_date): the DB itself refuses a second booking of the same night."""
    __tablename__ = "booking_nights"
    __table_args__ = (
        ForeignKeyConstraint(["booking_id", "accommodation_id"], ["bookings.id", "bookings.accommodation_id"],
                             ondelete="CASCADE"),
        Index(None, "booking_id"),
    )
    booking_id: Mapped[int] = mapped_column(BigInteger)
    accommodation_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    night_date: Mapped[date] = mapped_column(Date, primary_key=True)
    price: Mapped[int] = mapped_column(BigInteger)
    pricing_rule_id: Mapped[int | None] = mapped_column(ForeignKey("pricing_rules.id"))


class WaitlistRequest(Base):
    __tablename__ = "waitlist_requests"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_waitlist_dates"),
        Index(None, "accommodation_id", "status", "created_at"),
        Index(None, "user_id"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id"))
    check_in: Mapped[date] = mapped_column(Date)
    check_out: Mapped[date] = mapped_column(Date)
    guests_count: Mapped[int] = mapped_column(SmallInteger)
    held_amount: Mapped[int] = mapped_column(BigInteger)  # price snapshot paid upfront
    status: Mapped[WaitlistStatus] = mapped_column(_enum(WaitlistStatus), default=WaitlistStatus.waiting)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    booking_id: Mapped[int | None] = mapped_column(ForeignKey("bookings.id"), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)  # queue order

    payments: Mapped[list["Payment"]] = relationship(back_populates="waitlist_request")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (CheckConstraint("booking_id IS NOT NULL OR waitlist_request_id IS NOT NULL",
                                      name="ck_payment_owner"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_id: Mapped[int | None] = mapped_column(ForeignKey("bookings.id"))
    waitlist_request_id: Mapped[int | None] = mapped_column(ForeignKey("waitlist_requests.id"))
    amount: Mapped[int] = mapped_column(BigInteger)
    gateway: Mapped[str] = mapped_column(String(50))
    authority: Mapped[str | None] = mapped_column(String(100), unique=True)
    ref_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    status: Mapped[PaymentStatus] = mapped_column(_enum(PaymentStatus), default=PaymentStatus.initiated)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime)
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    booking: Mapped[Booking | None] = relationship(back_populates="payments")
    waitlist_request: Mapped[WaitlistRequest | None] = relationship(back_populates="payments")


# ---------- points of interest ----------
class PoiCategory(Base):
    __tablename__ = "poi_categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class PointOfInterest(Base):
    __tablename__ = "points_of_interest"
    __table_args__ = (Index(None, "city_id", "category_id"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("poi_categories.id"))
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"))
    name: Mapped[str] = mapped_column(String(200))
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[PoiCategory] = relationship()
    city: Mapped[City] = relationship()


# ---------- pricing ----------
class Holiday(Base):
    __tablename__ = "holidays"
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    is_official: Mapped[bool] = mapped_column(Boolean, default=True)


class PricingRule(Base):
    __tablename__ = "pricing_rules"
    __table_args__ = (Index(None, "accommodation_id", "is_active"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id"))
    rule_type: Mapped[PricingRuleType] = mapped_column(_enum(PricingRuleType))
    adjustment_type: Mapped[AdjustmentType] = mapped_column(_enum(AdjustmentType))
    value: Mapped[int] = mapped_column(Integer)  # positive = increase, negative = discount
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    min_nights: Mapped[int | None] = mapped_column(SmallInteger)
    days_before_checkin: Mapped[int | None] = mapped_column(SmallInteger)
    priority: Mapped[int] = mapped_column(SmallInteger, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    accommodation: Mapped[Accommodation] = relationship(back_populates="pricing_rules")


# ---------- engagement ----------
class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="ck_rating"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id"), unique=True)  # one review per real stay
    rating: Mapped[int] = mapped_column(SmallInteger)
    comment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReviewStatus] = mapped_column(_enum(ReviewStatus), default=ReviewStatus.pending)
    admin_reply: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    booking: Mapped[Booking] = relationship(back_populates="review")


class Favorite(Base):
    __tablename__ = "favorites"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    accommodation_id: Mapped[int] = mapped_column(ForeignKey("accommodations.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    accommodation: Mapped[Accommodation] = relationship()
