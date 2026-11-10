"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hourglass } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { RequireAuth } from "@/components/require-auth";
import { api, errorMessage } from "@/lib/api";
import { fa, jDay, toman, waitlistStatusLabel } from "@/lib/format";
import { startPayment } from "@/lib/payments";
import type { WaitlistRequest } from "@/lib/types";

function Row({ w }: { w: WaitlistRequest }) {
  const router = useRouter();
  const qc = useQueryClient();
  const pay = useMutation({
    mutationFn: () => startPayment({ waitlist_request_id: w.id }),
    onSuccess: (url) => router.push(url),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const leave = useMutation({
    mutationFn: () => api(`/waitlist/${w.id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success(w.paid ? "از صف بیرون آمدی و پیش‌پرداخت برگشت." : "از صف بیرون آمدی.");
      qc.invalidateQueries({ queryKey: ["my-waitlist"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <li className="journal-sm flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={w.cover_image ?? ""} alt="" className="h-24 w-full rounded-lg object-cover sm:w-32" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={w.status === "waiting" ? "default" : "secondary"} className={w.status === "waiting" ? "bg-saffron text-ink" : ""}>
            {waitlistStatusLabel[w.status]}
          </Badge>
          {w.status === "waiting" && <span className="text-xs text-muted-foreground">{w.paid ? "پیش‌پرداخت شده" : "هنوز پرداخت نشده؛ تا پرداخت نکنی در صف حساب نمی‌شوی"}</span>}
        </div>
        <h3 className="text-display mt-1 text-2xl">
          <Link href={`/stays/${w.accommodation_id}`} className="hover:underline">{w.accommodation_title}</Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          {jDay(w.check_in)} تا {jDay(w.check_out)}، {fa(w.guests_count)} نفر، {toman(w.held_amount)}
        </p>
      </div>
      <div className="flex gap-2">
        {w.status === "waiting" && !w.paid && (
          <Button size="sm" className="bg-lapis" disabled={pay.isPending} onClick={() => pay.mutate()}>
            {pay.isPending && <Spinner />} پیش‌پرداخت
          </Button>
        )}
        {w.status === "waiting" && (
          <Button size="sm" variant="outline" className="text-anar" disabled={leave.isPending} onClick={() => leave.mutate()}>
            {leave.isPending && <Spinner />} خروج از صف
          </Button>
        )}
        {w.status === "fulfilled" && (
          <Button size="sm" asChild className="bg-firoozeh"><Link href="/trips">دیدن رزرو</Link></Button>
        )}
      </div>
    </li>
  );
}

function Waitlist() {
  const q = useQuery({ queryKey: ["my-waitlist"], queryFn: () => api<WaitlistRequest[]>("/waitlist/me") });
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold text-anar">صف انتظار</p>
      <h1 className="text-display mt-1 text-5xl text-ink">منتظر یک شب خالی</h1>
      <p className="mt-3 max-w-2xl leading-8 text-muted-foreground">
        وقتی رزروی لغو یا منقضی شود، قدیمی‌ترین درخواست پرداخت‌شده خودکار رزرو می‌شود. اگر تا روز ورود جا باز نشد، کل مبلغ برمی‌گردد.
      </p>
      <div className="mt-8">
        {q.isLoading ? (
          <Skeleton className="h-32" />
        ) : q.isError ? (
          <p className="text-anar">{errorMessage(q.error)}</p>
        ) : !q.data?.length ? (
          <Empty className="journal">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Hourglass /></EmptyMedia>
              <EmptyTitle>در هیچ صفی نیستی</EmptyTitle>
              <EmptyDescription>اگر تاریخ دلخواهت پر بود، در صفحهٔ اقامتگاه گزینهٔ «در صف انتظار بمان» را می‌بینی.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-4">{q.data.map((w) => <Row key={w.id} w={w} />)}</ul>
        )}
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense>
      <RequireAuth what="صف‌های انتظارت">
        <Waitlist />
      </RequireAuth>
    </Suspense>
  );
}
