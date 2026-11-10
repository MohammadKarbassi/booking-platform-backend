// Thin fetch client for the FastAPI backend. Requests go to /api/* and Next rewrites them (next.config.ts).

const TOKEN_KEY = "dor-iran-token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: the session simply won't persist */
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public raw?: unknown,
  ) {
    super(message);
  }
}

// Backend messages are English; the guest sees Persian ones that also say what to do next.
const MESSAGES: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/already booked/i, "بعضی از این شب‌ها همین حالا رزرو شده‌اند. تاریخ دیگری انتخاب کن یا در صف انتظار بمان."],
  [/Wait one minute/i, "برای کد تازه یک دقیقه صبر کن."],
  [/Wrong or expired code/i, "کد درست نیست یا منقضی شده. دوباره امتحان کن یا کد تازه بگیر."],
  [/check_out must be after check_in/i, "تاریخ خروج باید بعد از تاریخ ورود باشد."],
  [/check_in is in the past/i, "تاریخ ورود گذشته است. یک تاریخ از امروز به بعد انتخاب کن."],
  [/Minimum stay is (\d+)/i, (m) => `حداقل اقامت در این اقامتگاه ${faNum(Number(m[1]))} شب است.`],
  [/Guests must be between 1 and (\d+)/i, (m) => `تعداد مهمان‌ها باید بین ۱ و ${faNum(Number(m[1]))} نفر باشد.`],
  [/Blocked dates/i, "میزبان بعضی از این روزها را بسته است. تاریخ دیگری انتخاب کن."],
  [/Cannot cancel on or after check-in/i, "از روز ورود به بعد، رزرو لغو نمی‌شود."],
  [/Cannot cancel a (\w+)/i, "این رزرو دیگر قابل لغو نیست."],
  [/Only completed stays/i, "بعد از پایان اقامت می‌توانی نظر بدهی."],
  [/already reviewed/i, "برای این اقامت قبلاً نظر داده‌ای."],
  [/These dates are free/i, "این تاریخ‌ها آزادند؛ لازم نیست در صف بمانی، مستقیم رزرو کن."],
  [/Booking is (\w+)/i, "این کار در وضعیت فعلی این رزرو ممکن نیست؛ صفحه را تازه کن."],
  [/not awaiting payment/i, "این درخواست صف قبلاً پرداخت یا بسته شده است."],
  [/Payment already/i, "این پرداخت قبلاً ثبت شده است."],
  [/Unknown authority/i, "پرداختی با این شناسه پیدا نشد."],
  [/Missing bearer token|Invalid or expired token|User not found/i, "نشست تو تمام شده. دوباره وارد شو."],
  [/Admin only/i, "این بخش فقط برای مدیر سامانه است."],
  [/Accommodation not found/i, "این اقامتگاه پیدا نشد یا فعلاً فعال نیست."],
  [/Booking not found/i, "این رزرو پیدا نشد."],
  [/Waitlist request not found/i, "این درخواست صف پیدا نشد."],
  [/Request is (\w+)/i, "این درخواست صف دیگر فعال نیست."],
  [/Constraint violated/i, "این اطلاعات با داده‌های موجود تداخل دارد؛ مثلاً نامک (slug) تکراری است."],
  [/Unknown amenity/i, "یکی از امکانات انتخاب‌شده وجود ندارد."],
  [/max_capacity must be/i, "ظرفیت حداکثر باید از ظرفیت پایه بیشتر یا برابر باشد."],
  [/rule needs/i, "برای این نوع قانون قیمت، فیلدهای لازم را پر کن."],
  [/end must be after start/i, "تاریخ پایان باید بعد از تاریخ شروع باشد."],
];

function translate(status: number, detail: unknown): string {
  if (Array.isArray(detail)) {
    const fields = detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => {
        const msg = d.msg ?? "";
        const hit = MESSAGES.find(([re]) => re.test(msg));
        if (hit) return typeof hit[1] === "string" ? hit[1] : hit[1](msg.match(hit[0])!);
        return d.loc?.slice(1).join(".") ?? "";
      })
      .filter(Boolean);
    return `اطلاعات فرم کامل یا درست نیست${fields.length ? `: ${fields.join("، ")}` : "."}`;
  }
  const text = typeof detail === "string" ? detail : "";
  for (const [re, out] of MESSAGES) {
    const m = text.match(re);
    if (m) return typeof out === "string" ? out : out(m);
  }
  if (status === 401) return "اول وارد حسابت شو.";
  if (status === 403) return "اجازهٔ این کار را نداری.";
  if (status === 404) return "پیدا نشد.";
  if (status >= 500) return "سرور به مشکل خورد. چند لحظه بعد دوباره امتحان کن.";
  return text || "درخواست انجام نشد.";
}

type Opts = { method?: string; body?: unknown; query?: Record<string, unknown> };

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
    else qs.set(k, String(v));
  }
  const url = `/api${path}${qs.size ? `?${qs}` : ""}`;
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "ارتباط با سرور برقرار نشد. اینترنت یا روشن بودن بک‌اند را بررسی کن.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event("dor-iran:logout"));
    }
    throw new ApiError(res.status, translate(res.status, data?.detail), data);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "مشکلی پیش آمد. دوباره امتحان کن.";
}

function faNum(n: number) {
  return n.toLocaleString("fa-IR");
}
