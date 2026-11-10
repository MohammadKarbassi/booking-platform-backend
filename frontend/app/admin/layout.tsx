"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "اقامتگاه‌ها" },
  { href: "/admin/bookings", label: "رزروها" },
  { href: "/admin/reviews", label: "نظرها" },
  { href: "/admin/hosts", label: "میزبان‌ها" },
  { href: "/admin/holidays", label: "تعطیلات" },
  { href: "/admin/places", label: "جاذبه‌ها" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/stays");
  return pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full" />
        <div className="mt-8 flex gap-2">
          {TABS.map((t) => (
            <Skeleton key={t.href} className="h-9 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="mt-8 h-80 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="journal p-8 text-center">
          <LogIn className="mx-auto size-10 text-lapis" />
          <h1 className="text-display mt-4 text-4xl">اول وارد شو</h1>
          <p className="mt-3 leading-8 text-ink/80">پنل مدیریت فقط با حساب مدیر باز می‌شود.</p>
          <Button asChild className="journal-sm journal-press mt-6 h-10 rounded-full bg-lapis px-6 font-bold">
            <Link href="/login?next=/admin">ورود به حساب مدیر</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <div className="journal p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-anar" />
          <h1 className="text-display mt-4 text-4xl">این بخش فقط برای مدیر سامانه است</h1>
          <p className="mt-3 leading-8 text-ink/80">اگر دنبال سفر بعدی‌ات هستی، از صفحهٔ اقامتگاه‌ها شروع کن.</p>
          <Button asChild variant="outline" className="journal-sm journal-press mt-6 h-10 rounded-full px-6 font-bold">
            <Link href="/stays">برو به اقامتگاه‌ها</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <p className="text-sm font-bold text-anar">دور ایران</p>
        <h1 className="text-display mt-1 text-5xl text-ink">پنل مدیریت</h1>
        <p className="mt-2 text-ink/75">اقامتگاه‌ها، قیمت‌ها، رزروها و نظرهای مسافران را از همین‌جا اداره کن.</p>
      </header>
      <nav aria-label="بخش‌های پنل مدیریت" className="mt-6 flex flex-wrap gap-2 border-b-2 border-ink pb-4">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border-[1.5px] border-ink px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-ink/5",
                active && "bg-ink text-paper hover:bg-ink",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}
