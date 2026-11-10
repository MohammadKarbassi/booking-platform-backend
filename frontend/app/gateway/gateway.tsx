"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CircleCheck, CircleX, FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StampSeal } from "@/components/stamp-seal";
import { api, errorMessage } from "@/lib/api";
import { fa, toman } from "@/lib/format";
import { useSound } from "@/lib/sound";
import type { PaymentResult } from "@/lib/types";

/*
  Stand-in for the bank gateway the backend simulates (mock-zarinpal). It never asks for card details:
  it only lets the tester choose the outcome, then calls GET /payments/callback like the bank redirect would.
*/
export function Gateway() {
  const sp = useSearchParams();
  const authority = sp.get("authority") ?? "";
  const amount = Number(sp.get("amount") ?? 0);
  const kind = sp.get("kind") === "waitlist" ? "waitlist" : "booking";
  const id = sp.get("id");
  const qc = useQueryClient();
  const { stamp } = useSound();

  const cb = useMutation({
    mutationFn: (status: "OK" | "NOK") => api<PaymentResult>("/payments/callback", { query: { authority, status } }),
    onSuccess: (r) => {
      if (r.status === "success") stamp();
      qc.invalidateQueries();
    },
  });

  useEffect(() => {
    if (cb.data?.status === "success") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [cb.data]);

  const r = cb.data;
  const backHref = kind === "booking" ? `/checkout/${id}` : "/waitlist";

  if (r) {
    const paid = r.status === "success";
    const lateRefund = r.payment_status === "refunded";
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        {paid && !lateRefund ? (
          <>
            <StampSeal title="پرداخت شد" sub={r.ref_id ? `پیگیری ${fa(Number(r.ref_id), { useGrouping: false })}` : undefined} />
            <h1 className="text-display mt-6 text-4xl text-ink">
              {kind === "booking" ? "سفرت قطعی شد!" : "در صف انتظار ثبت شدی"}
            </h1>
            <p className="mt-3 leading-8 text-muted-foreground">
              {kind === "booking"
                ? "رسید و جزئیات در سفرنامه‌ات است. چمدان را ببند."
                : r.auto_booked?.length
                  ? "خبر خوب: شب‌ها همین حالا آزاد بودند و رزروت خودکار قطعی شد."
                  : "به محض آزاد شدن این شب‌ها، به نوبت برایت رزرو می‌شود. اگر تا روز ورود آزاد نشد، مبلغ کامل برمی‌گردد."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button asChild className="bg-lapis font-bold">
                <Link href={kind === "booking" || r.auto_booked?.length ? "/trips" : "/waitlist"}>
                  {kind === "booking" || r.auto_booked?.length ? "سفرنامهٔ من" : "صف‌های انتظار من"}
                </Link>
              </Button>
              <Button asChild variant="outline"><Link href="/stays">کشف جاهای دیگر</Link></Button>
            </div>
          </>
        ) : paid && lateRefund ? (
          <Alert className="text-start">
            <AlertTitle>پول رسید، ولی دیر</AlertTitle>
            <AlertDescription>
              مهلت ۱۵ دقیقه‌ای رزرو تمام شده بود، برای همین مبلغ خودکار برگشت داده شد. دوباره رزرو کن.
              <Button asChild size="sm" className="mt-3 bg-lapis"><Link href="/trips">سفرنامهٔ من</Link></Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <StampSeal title="ناموفق" color="var(--anar)" />
            <h1 className="text-display mt-6 text-4xl text-ink">پرداخت انجام نشد</h1>
            <p className="mt-3 text-muted-foreground">هیچ مبلغی کم نشد. اگر هنوز وقت داری، دوباره امتحان کن.</p>
            <Button asChild className="mt-6 bg-lapis font-bold"><Link href={backHref}>برگشت و پرداخت دوباره</Link></Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-[repeating-linear-gradient(135deg,transparent_0_14px,rgb(23_32_61/0.03)_14px_28px)] px-4 py-14">
      <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 shadow-xl">
        <div className="flex items-center gap-2 rounded-lg bg-saffron/15 p-3 text-sm font-semibold">
          <FlaskConical className="size-4 shrink-0" />
          درگاه پرداخت آزمایشی؛ هیچ پول واقعی جابه‌جا نمی‌شود.
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">پذیرنده</dt><dd className="font-bold">دور ایران</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">بابت</dt><dd className="font-bold">{kind === "booking" ? "رزرو اقامتگاه" : "پیش‌پرداخت صف انتظار"}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">شناسهٔ تراکنش</dt><dd dir="ltr" className="font-mono text-xs">{authority.slice(0, 12)}…</dd></div>
        </dl>
        <div className="mt-6 rounded-xl bg-muted p-4 text-center">
          <div className="text-xs text-muted-foreground">مبلغ قابل پرداخت</div>
          <div className="text-display mt-1 text-3xl">{toman(amount)}</div>
        </div>
        {cb.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{errorMessage(cb.error)}</AlertDescription>
          </Alert>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">نتیجهٔ پرداخت را انتخاب کن:</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="lg" className="bg-firoozeh font-bold hover:bg-firoozeh/90" disabled={cb.isPending || !authority} onClick={() => cb.mutate("OK")}>
            {cb.isPending ? <Spinner /> : <CircleCheck />} پرداخت موفق
          </Button>
          <Button size="lg" variant="outline" className="font-bold" disabled={cb.isPending || !authority} onClick={() => cb.mutate("NOK")}>
            <CircleX /> پرداخت ناموفق
          </Button>
        </div>
      </div>
    </div>
  );
}
