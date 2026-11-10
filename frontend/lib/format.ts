// Persian digits, Toman prices (the API stores Rial) and Jalali dates.

export const fa = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString("fa-IR", opts);

/** Rial → "۴٬۰۰۰٬۰۰۰ تومان" */
export const toman = (rial: number) => `${fa(Math.round(rial / 10))} تومان`;

/** Rial → "۴ میلیون" / "۸۰۰ هزار" for tight spaces */
export function tomanShort(rial: number) {
  const t = rial / 10;
  if (t >= 1_000_000) return `${fa(Math.round((t / 1_000_000) * 10) / 10)} میلیون`;
  if (t >= 1_000) return `${fa(Math.round(t / 1_000))} هزار`;
  return fa(t);
}

/** "2026-11-20" → local Date at midnight (no UTC shift) */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → "2026-11-20" in local time */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const J = "fa-IR-u-ca-persian";

/** "۲۹ آبان" */
export const jDay = (v: string | Date) =>
  new Intl.DateTimeFormat(J, { day: "numeric", month: "long" }).format(typeof v === "string" ? parseDate(v) : v);

/** "۲۹ آبان ۱۴۰۵" */
export const jDate = (v: string | Date) =>
  new Intl.DateTimeFormat(J, { day: "numeric", month: "long", year: "numeric" }).format(
    typeof v === "string" ? parseDate(v) : v,
  );

/** "پنجشنبه ۲۹ آبان" */
export const jWeekday = (v: string | Date) =>
  new Intl.DateTimeFormat(J, { weekday: "long", day: "numeric", month: "long" }).format(
    typeof v === "string" ? parseDate(v) : v,
  );

/** "۱۴۰۵/۰۸/۲۹" — the postmark style */
export const jShort = (v: string | Date) =>
  new Intl.DateTimeFormat(J, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof v === "string" ? parseDate(v) : v,
  );

/** timestamp (ISO with time) → "۲۹ آبان، ۱۴:۰۵" */
export const jDateTime = (iso: string) =>
  new Intl.DateTimeFormat(J, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/** "14:00:00" → "۱۴:۰۰" */
export const clock = (t: string) => fa(Number(t.slice(0, 2)), { minimumIntegerDigits: 2 }) + ":" + fa(Number(t.slice(3, 5)), { minimumIntegerDigits: 2 });

export const nightsBetween = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const today = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const bookingStatusLabel: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "قطعی",
  cancelled: "لغو شده",
  expired: "منقضی شده",
  completed: "اقامت تمام شد",
};

export const waitlistStatusLabel: Record<string, string> = {
  waiting: "در صف",
  fulfilled: "رزرو شد",
  expired: "منقضی و بازپرداخت",
  cancelled: "لغو و بازپرداخت",
};

export const priceSourceLabel: Record<string, string> = {
  base: "قیمت پایه",
  calendar: "قیمت ویژهٔ میزبان",
  weekend: "آخر هفته",
  holiday: "تعطیلی رسمی",
  season: "فصل",
  long_stay: "تخفیف اقامت طولانی",
  last_minute: "تخفیف لحظهٔ آخری",
  early_bird: "تخفیف رزرو زودهنگام",
};
