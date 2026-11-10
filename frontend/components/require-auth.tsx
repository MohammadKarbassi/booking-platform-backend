"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children, what = "این صفحه" }: { children: React.ReactNode; what?: string }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const sp = useSearchParams();
  if (!ready)
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-12">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!user) {
    const here = sp.size ? `${pathname}?${sp}` : pathname;
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <Empty className="journal">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LockKeyhole />
            </EmptyMedia>
            <EmptyTitle className="text-display text-3xl">اول وارد شو</EmptyTitle>
            <EmptyDescription>برای دیدن {what} باید وارد حسابت شوی.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="bg-lapis font-bold">
              <Link href={`/login?next=${encodeURIComponent(here)}`}>ورود / ثبت‌نام</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }
  return <>{children}</>;
}
