"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CreditCard, TimerReset, Users } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { StampSeal } from "@/components/stamp-seal";
import { api, errorMessage } from "@/lib/api";
import { bookingStatusLabel, fa, jWeekday, toman } from "@/lib/format";
import { startPayment } from "@/lib/payments";
import type { Booking } from "@/lib/types";

const HOLD_MS = 15 * 60 * 1000;

function useCountdown(until: string | null) {
  const [left, setLeft] = useState(() => (until ? new Date(until).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!until) return;
    const tick = () => setLeft(Math.max(0, new Date(until).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  return left;
}

export function Checkout({ id }: { id: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["booking", id], queryFn: () => api<Booking>(`/bookings/${id}`) });
  const b = q.data;
  const left = useCountdown(b?.status === "pending_payment" ? b.expires_at : null);
  const expired = b?.status === "pending_payment" && left <= 0;

  useEffect(() => {
    if (expired) q.refetch();
  }, [expired]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = useMutation({
    mutationFn: () => startPayment({ booking_id: id }),
    onSuccess: (url) => router.push(url),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: () => api<Booking>(`/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.success("رزرو لغو شد و شب‌ها آزاد شدند.");
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <div className="mx-auto max-w-4xl px-4 py-12"><Skeleton className="h-96" /></div>;
  if (q.isError || !b)
    return (
      <div className="mx-auto max-w-xl px-4 py-24">
        <Alert variant="destructive">
          <AlertTitle>این رزرو باز نشد</AlertTitle>
          <AlertDescription>{errorMessage(q.error)}</AlertDescription>
        </Alert>
      </div>
    );

  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm font-bold text-anar">مرحلهٔ آخر</p>
      <h1 className="text-display mt-1 text-5xl text-ink">
        {b.status === "pending_payment" ? "بلیت سفرت آماده است" : bookingStatusLabel[b.status]}
      </h1>

      {/* the ticket */}
      <div className="journal mt-8 grid overflow-hidden md:grid-cols-[1fr_auto_300px]">
        <div className="flex gap-4 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.cover_image ?? ""} alt="" className="hidden size-28 shrink-0 rounded-lg object-cover sm:block" />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">کد رزرو <span dir="ltr" className="font-mono font-bold text-ink">{b.booking_code}</span></p>
            <h2 className="text-display text-3xl text-ink">
              <Link href={`/stays/${b.accommodation_id}`} className="hover:underline">{b.accommodation_title}</Link>
            </h2>
            <p className="flex items-center gap-2 text-sm"><CalendarDays className="size-4 text-lapis" /> {jWeekday(b.check_in)} تا {jWeekday(b.check_out)}</p>
            <p className="flex items-center gap-2 text-sm"><Users className="size-4 text-lapis" /> {fa(b.guests_count)} مسافر، {fa(b.nights.length)} شب، {b.city}</p>
          </div>
        </div>
        {/* perforation */}
        <div className="relative hidden w-0 border-r-2 border-dashed border-ink/40 md:block">
          <span className="absolute -top-3 -right-3 size-6 rounded-full border-2 border-ink bg-paper" />
          <span className="absolute -right-3 -bottom-3 size-6 rounded-full border-2 border-ink bg-paper" />
        </div>
        <div className="space-y-3 border-t-2 border-dashed border-ink/40 bg-muted/40 p-5 md:border-t-0">
          <ul className="space-y-1 text-sm">
            {b.nights.map((n) => (
              <li key={n.night} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{jWeekday(n.night)}</span>
                <span className="tabular-nums">{toman(n.price)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-bold">جمع</span>
            <span className="text-display text-2xl">{toman(b.total_price)}</span>
          </div>
        </div>
      </div>

      {b.status === "pending_payment" && !expired && (
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="journal-sm p-5">
            <p className="flex items-center gap-2 font-bold">
              <TimerReset className="size-5 text-anar" />
              این شب‌ها تا <span className="tabular-nums text-anar" aria-live="polite">{fa(mm)}:{fa(ss, { minimumIntegerDigits: 2 })}</span> دیگر برای تو نگه داشته می‌شوند
            </p>
            <Progress value={(left / HOLD_MS) * 100} className="mt-3 h-2 [&>div]:bg-anar" aria-label="زمان باقی‌مانده" />
            <p className="mt-3 text-sm text-muted-foreground">اگر پرداخت نکنی، رزرو خودکار منقضی و شب‌ها برای بقیه آزاد می‌شود.</p>
          </div>
          <div className="space-y-2">
            <Button size="lg" className="journal-press h-14 w-full rounded-xl border-2 border-ink bg-lapis text-lg font-bold shadow-[var(--shadow-journal-sm)]" disabled={pay.isPending} onClick={() => pay.mutate()}>
              {pay.isPending ? <Spinner /> : <CreditCard />}
              پرداخت {toman(b.total_price)}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending && <Spinner />} منصرف شدم، رزرو را لغو کن
            </Button>
          </div>
        </div>
      )}

      {(expired || b.status === "expired") && (
        <Alert className="mt-8 border-anar/40">
          <TimerReset className="text-anar" />
          <AlertTitle>مهلت پرداخت تمام شد</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            شب‌ها آزاد شدند. اگر هنوز خالی باشند، می‌توانی دوباره رزرو کنی.
            <Button asChild size="sm" className="bg-lapis"><Link href={`/stays/${b.accommodation_id}`}>رزرو دوباره</Link></Button>
          </AlertDescription>
        </Alert>
      )}

      {b.status === "confirmed" && (
        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <StampSeal title="قطعی شد" sub={b.city} />
          <p className="text-lg">رزروت قطعی است. سفرنامه‌ات یک مهر تازه گرفت!</p>
          <Button asChild className="bg-lapis font-bold"><Link href="/trips">برو به سفرنامهٔ من</Link></Button>
        </div>
      )}
      {b.status === "cancelled" && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground">این رزرو لغو شد. اگر پرداخت کرده بودی، مبلغ برگشت داده شد.</p>
          <Button asChild variant="outline"><Link href="/stays">یک مقصد دیگر پیدا کن</Link></Button>
        </div>
      )}
    </div>
  );
}
