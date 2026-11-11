/*
  Home-page explainer for the booking waitlist (backend: POST /waitlist, upfront payment, first-come auto-booking
  on cancellation, full refund when nothing frees up before check-in). Three ticket stubs, because it is a sequence.
*/

import Link from "next/link";
import { ArrowLeft, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StampSeal } from "@/components/stamp-seal";

const DAYS = Array.from({ length: 14 }, (_, i) => i + 17); // late Aban, which has 30 days
const TAKEN = new Set([22, 23, 24]);

function Stub({ n, title, children, text }: { n: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <li className="relative flex flex-col rounded-2xl border-2 border-paper/80 bg-paper text-ink shadow-[-6px_6px_0_var(--saffron)]">
      <div className="grid h-44 place-items-center border-b-2 border-dashed border-ink/30 p-4">{children}</div>
      {/* ticket notches */}
      <span aria-hidden className="absolute top-44 -right-3 size-6 -translate-y-1/2 rounded-full bg-ink" />
      <span aria-hidden className="absolute top-44 -left-3 size-6 -translate-y-1/2 rounded-full bg-ink" />
      <div className="flex-1 p-5">
        <p className="flex items-center gap-2">
          <span className="text-display grid size-8 place-items-center rounded-full bg-ink text-lg text-saffron">{n}</span>
          <span className="text-display text-2xl">{title}</span>
        </p>
        <p className="mt-2 leading-7 text-ink/80">{text}</p>
      </div>
    </li>
  );
}

export function WaitlistShowcase() {
  return (
    <section className="mt-28 bg-ink text-paper" aria-labelledby="waitlist-title">
      <div className="mx-auto max-w-7xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-saffron">
              <Hourglass className="size-4" /> صف رزرو
            </p>
            <h2 id="waitlist-title" className="text-display mt-2 text-5xl">
              پر است؟ هنوز تمام نشده.
            </h2>
            <p className="mt-4 max-w-2xl leading-8 text-paper/75">
              اگر شب‌هایی که می‌خواهی رزرو شده‌اند، در صف بمان. هر رزروی که لغو یا منقضی شود، همان لحظه به نفر اول صف می‌رسد؛
              بدون این‌که لازم باشد مدام سر بزنی.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-saffron font-bold text-ink hover:bg-saffron/90">
              <Link href="/stays">یک تاریخ پر را امتحان کن</Link>
            </Button>
            <Button asChild variant="outline" className="border-paper/40 bg-transparent text-paper hover:bg-paper/10 hover:text-paper">
              <Link href="/waitlist">
                صف‌های من <ArrowLeft />
              </Link>
            </Button>
          </div>
        </div>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          <Stub n="۱" title="تاریخت پر است" text="روزهای پر در تقویم خط خورده‌اند. همان روزها را انتخاب کن؛ دکمهٔ رزرو به «در صف بمان» تبدیل می‌شود.">
            <div className="grid grid-cols-7 gap-1.5" aria-hidden>
              {DAYS.map((d) => (
                <span
                  key={d}
                  className={`grid size-8 place-items-center rounded-md text-sm font-bold ${
                    TAKEN.has(d) ? "bg-anar/15 text-anar line-through decoration-2" : "bg-ink/5"
                  }`}
                >
                  {d.toLocaleString("fa-IR")}
                </span>
              ))}
            </div>
          </Stub>
          <Stub n="۲" title="پیش‌پرداخت و نوبت" text="مبلغ را الان می‌پردازی و نوبتت ثبت می‌شود. صف به ترتیب پرداخت است و هر وقت بخواهی، بی‌جریمه بیرون می‌آیی.">
            <div className="flex -rotate-3 items-stretch overflow-hidden rounded-xl border-2 border-ink bg-card shadow-[var(--shadow-journal-sm)]" aria-hidden>
              <div className="grid place-items-center bg-saffron px-4">
                <span className="text-display text-4xl">۱</span>
                <span className="text-[10px] font-bold">نوبت</span>
              </div>
              <div className="border-r-2 border-dashed border-ink/40 px-4 py-3 text-sm">
                <p className="font-bold">خانهٔ بادگیر یزد</p>
                <p className="text-ink/70">۵ تا ۸ آذر، ۲ نفر</p>
                <p className="mt-1 font-bold text-firoozeh">پیش‌پرداخت شد</p>
              </div>
            </div>
          </Stub>
          <Stub n="۳" title="خودکار مال تو" text="اگر کسی لغو کند، رزرو بی‌درنگ به اسم تو قطعی می‌شود. اگر تا روز ورود جا باز نشد، کل مبلغ خودکار برمی‌گردد.">
            <StampSeal title="قطعی شد" sub="از صف انتظار" className="size-32 [&_.text-display]:text-2xl" />
          </Stub>
        </ol>
      </div>
    </section>
  );
}
