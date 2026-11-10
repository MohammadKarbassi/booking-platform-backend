import Link from "next/link";
import { BrandMark } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="text-display text-3xl">دور ایران</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-7 text-paper/70">
            هر اقامتگاه یک نقطهٔ شروع است. ببین دور و برش چه خبر است، بعد کوله‌ات را ببند.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-saffron">سفر</h2>
          <ul className="space-y-2 text-sm text-paper/80">
            <li><Link className="hover:text-white" href="/stays">همهٔ اقامتگاه‌ها</Link></li>
            <li><Link className="hover:text-white" href="/trips">سفرنامهٔ من</Link></li>
            <li><Link className="hover:text-white" href="/waitlist">صف‌های انتظار</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold text-saffron">دربارهٔ این نسخه</h2>
          <p className="text-sm leading-7 text-paper/70">
            پروژهٔ بوت‌کمپ. درگاه پرداخت و پیامک شبیه‌سازی شده‌اند. عکس‌ها از ویکی‌مدیا کامنز با مجوز آزاد.
          </p>
        </div>
      </div>
    </footer>
  );
}
