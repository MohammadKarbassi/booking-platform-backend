// Shapes returned by the FastAPI backend (backend/app/serializers.py and routers).

export type Rating = { average: number | null; count: number };

export type AccommodationStatus = "draft" | "active" | "inactive";

export type StayCard = {
  id: number;
  title: string;
  slug: string;
  type: string;
  city: string;
  province: string;
  base_price_per_night: number;
  max_capacity: number;
  bedrooms: number;
  cover_image: string | null;
  latitude: number;
  longitude: number;
  status: AccommodationStatus;
  rating: Rating;
  /** only when searching around a landmark (near_poi_id) */
  distance_km?: number;
};

export type Landmark = {
  id: number;
  name: string;
  category: string;
  category_id: number;
  city: string;
  latitude: number;
  longitude: number;
  stays_nearby: number;
};

export type Amenity = { id: number; name: string; icon: string | null };

export type StayDetail = StayCard & {
  description: string | null;
  address: string;
  base_capacity: number;
  beds: number;
  bathrooms: number;
  area_m2: number | null;
  extra_guest_price: number;
  min_nights: number;
  check_in_time: string;
  check_out_time: string;
  house_rules: string | null;
  host: { id: number; full_name: string };
  images: { url: string; is_cover: boolean }[];
  amenities: Amenity[];
};

export type SearchResult = { total: number; page: number; size: number; items: StayCard[] };

export type QuoteNight = { night: string; price: number; source: string; pricing_rule_id: number | null };
export type Quote = {
  nights: number;
  extra_guest_fee_per_night: number;
  total_price: number;
  breakdown: QuoteNight[];
};

export type CalendarDay = { date: string; available: boolean; price: number };

export type Poi = {
  id: number;
  name: string;
  category: string;
  distance_km: number;
  latitude: number;
  longitude: number;
};

export type Review = {
  id: number;
  rating: number;
  comment: string | null;
  admin_reply: string | null;
  guest: string | null;
  created_at: string;
};

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired" | "completed";
export type PaymentStatus = "initiated" | "success" | "failed" | "refunded";

export type Booking = {
  id: number;
  booking_code: string;
  accommodation_id: number;
  accommodation_title: string;
  cover_image: string | null;
  city: string;
  guest: { phone: string; name: string | null };
  review: { rating: number; status: ReviewStatus } | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
  status: BookingStatus;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  nights: { night: string; price: number; pricing_rule_id: number | null }[];
  payments: { id: number; amount: number; status: PaymentStatus; ref_id: string | null }[];
  waitlist_bookings_created?: number[];
};

export type WaitlistStatus = "waiting" | "fulfilled" | "expired" | "cancelled";
export type WaitlistRequest = {
  id: number;
  accommodation_id: number;
  accommodation_title: string;
  cover_image: string | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  held_amount: number;
  status: WaitlistStatus;
  expires_at: string;
  booking_id: number | null;
  paid: boolean;
};

export type User = {
  id: number;
  phone: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "guest" | "admin";
};

export type PaymentStart = { payment_id: number; amount: number; authority: string; gateway_url: string };
export type PaymentResult = {
  payment_id: number;
  status: PaymentStatus;
  ref_id?: string;
  payment_status?: PaymentStatus;
  booking_id?: number;
  booking_status?: BookingStatus;
  waitlist_request_id?: number;
  auto_booked?: number[];
};

export type Province = { id: number; name: string };
export type City = { id: number; name: string; province_id: number };
export type StayType = { id: number; name: string; slug: string };
export type PoiCategory = { id: number; name: string };
export type Host = { id: number; full_name: string; phone: string };

export type PricingRuleType = "weekend" | "holiday" | "season" | "long_stay" | "last_minute" | "early_bird";
export type PricingRule = {
  id: number;
  rule_type: PricingRuleType;
  adjustment_type: "percent" | "fixed";
  value: number;
  start_date: string | null;
  end_date: string | null;
  min_nights: number | null;
  days_before_checkin: number | null;
  priority: number;
  is_active: boolean;
};
export type Holiday = { date: string; title: string; is_official: boolean };

export type ReviewStatus = "pending" | "approved" | "rejected";
export type AdminReview = {
  id: number;
  booking_id: number;
  accommodation_id: number;
  accommodation_title: string;
  guest: string | null;
  created_at: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  admin_reply: string | null;
};
