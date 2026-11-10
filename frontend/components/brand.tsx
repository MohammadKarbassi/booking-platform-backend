import Link from "next/link";
import { cn } from "@/lib/utils";

/** The mark: a dashed saffron loop ("دور") around a lapis dot. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <circle cx="20" cy="20" r="15" fill="none" stroke="var(--saffron)" strokeWidth="3.5" strokeDasharray="5 4" />
      <circle cx="20" cy="20" r="6" fill="var(--lapis)" />
      <circle cx="33" cy="12" r="3.2" fill="var(--anar)" stroke="var(--paper)" strokeWidth="1.5" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 rounded-md", className)} aria-label="دور ایران، صفحهٔ اصلی">
      <BrandMark />
      <span className="text-display text-[1.7rem] text-ink">دور ایران</span>
    </Link>
  );
}
