"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Hourglass, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { DatesPicker, GuestsPicker, type Dates } from "@/components/search-fields";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fa, jWeekday, parseDate, priceSourceLabel, toman, tomanShort } from "@/lib/format";
import { startPayment } from "@/lib/payments";
import { useCalendar, useQuote } from "@/lib/queries";
import { useSound } from "@/lib/sound";
import type { Booking, StayDetail, WaitlistRequest } from "@/lib/types";
import { isoDate, today } from "@/lib/format";

export function BookingCard({ stay, initial }: { stay: StayDetail; initial: Dates & { guests?: number } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { stamp } = useSound();
  const [dates, setDates] = useState<Dates>({ check_in: initial.check_in, check_out: initial.check_out });
  const [guests, setGuests] = useState(Math.min(initial.guests ?? 2, stay.max_capacity));
  const [waitOffer, setWaitOffer] = useState(false);

  const cal = useCalendar(stay.id, isoDate(today()), 90);
  const booked = useMemo(() => (cal.data ?? []).filter((d) => !d.available).map((d) => parseDate(d.date)), [cal.data]);
  const quote = useQuote(stay.id, dates.check_in, dates.check_out, guests);

  const selectedTaken = useMemo(() => {
    if (!dates.check_in || !dates.check_out || !cal.data) return false;
    return cal.data.some((d) => !d.available && d.date >= dates.check_in! && d.date < dates.check_out!);
  }, [dates, cal.data]);

  const requireLogin = () => {
    toast("برای رزرو، اول وارد شو. تاریخ‌هایت یادمان می‌ماند.");
    const qs = new URLSearchParams({ check_in: dates.check_in ?? "", check_out: dates.check_out ?? "", guests: String(guests) });
    router.push(`/login?next=${encodeURIComponent(`/stays/${stay.id}?${qs}`)}`);
  };

  const book = useMutation({
    mutationFn: () =>
      api<Booking>("/bookings", {
        method: "POST",
        body: { accommodation_id: stay.id, check_in: dates.check_in, check_out: dates.check_out, guests_count: guests },
      }),
    onSuccess: (b) => {
      stamp();
      toast.success(`رزرو ${b.booking_code} ثبت شد؛ ۱۵ دقیقه برای پرداخت وقت داری.`);
      router.push(`/checkout/${b.id}`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409 && /already booked/i.test(JSON.stringify(e.raw))) {
        cal.refetch();
        setWaitOffer(true);
      } else toast.error(errorMessage(e));
    },
  });

  const wait = useMutation({
    mutationFn: async () => {
      const w = await api<WaitlistRequest>("/waitlist", {
        method: "POST",
        body: { accommodation_id: stay.id, check_in: dates.check_in, check_out: dates.check_out, guests_count: guests },
      });
      return startPayment({ waitlist_request_id: w.id });
    },
    onSuccess: (url) => {
      stamp();
      router.push(url);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const ready = Boolean(dates.check_in && dates.check_out);

  return (
    <div className="journal p-5">
      <div className="flex items-baseline justify-between">
        <p>
          <span className="text-display text-3xl text-ink">{tomanShort(stay.base_price_per_night)}</span>
          <span className="text-muted-foreground"> تومان / شب</span>
        </p>
        <span className="text-xs text-muted-foreground">قیمت پایه</span>
      </div>

      <div className="mt-4 grid grid-cols-1 overflow-hidden rounded-xl border-[1.5px] border-ink/70 bg-card">
        <DatesPicker value={dates} onChange={setDates} booked={booked} minNights={stay.min_nights} className="rounded-none" />
        <div className="border-t border-dashed border-ink/30" />
        <GuestsPicker value={guests} onChange={setGuests} max={stay.max_capacity} className="rounded-none" />
      </div>
      {stay.min_nights > 1 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" /> حداقل اقامت {fa(stay.min_nights)} شب
        </p>
      )}
      {guests > stay.base_capacity && stay.extra_guest_price > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          از نفر {fa(stay.base_capacity + 1)} به بعد، هر شب {toman(stay.extra_guest_price)} اضافه می‌شود.
        </p>
      )}

      {ready && (
        <div className="mt-5">
          {quote.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : quote.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage(quote.error)}</AlertDescription>
            </Alert>
          ) : quote.data ? (
            <>
              <Accordion type="single" collapsible>
                <AccordionItem value="nights" className="border-b-0">
                  <AccordionTrigger className="py-2 text-sm">
                    {fa(quote.data.nights)} شب، جزئیات قیمت هر شب
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 text-sm">
                      {quote.data.breakdown.map((n) => (
                        <li key={n.night} className="flex items-center justify-between gap-2">
                          <span>
                            {jWeekday(n.night)}
                            {n.source !== "base" && (
                              <span className="ms-1.5 rounded-full bg-saffron/25 px-2 py-0.5 text-[11px] font-semibold">
                                {priceSourceLabel[n.source] ?? n.source}
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums">{toman(n.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-ink/40 pt-3">
                <span className="font-bold">جمع کل</span>
                <span className="text-display text-2xl">{toman(quote.data.total_price)}</span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {selectedTaken ? (
        <>
          <Alert className="mt-5 border-anar/40 bg-anar/5">
            <Hourglass className="text-anar" />
            <AlertTitle>این تاریخ‌ها پر است</AlertTitle>
            <AlertDescription>
              مبلغ را الان می‌پردازی و در صف می‌مانی. اگر رزروی لغو شود، به نوبت خودکار برای تو رزرو می‌شود؛ وگرنه تا روز ورود پولت
              برمی‌گردد.
            </AlertDescription>
          </Alert>
          <Button
            size="lg"
            className="mt-3 h-12 w-full bg-anar text-base font-bold hover:bg-anar/90"
            disabled={!quote.data || wait.isPending}
            onClick={() => (user ? wait.mutate() : requireLogin())}
          >
            {wait.isPending && <Spinner />}
            در صف انتظار بمان و پرداخت کن
          </Button>
        </>
      ) : (
        <Button
          size="lg"
          className="journal-press mt-5 h-12 w-full rounded-xl border-2 border-ink bg-lapis text-base font-bold shadow-[var(--shadow-journal-sm)]"
          disabled={(ready && !quote.data) || book.isPending}
          onClick={() => {
            if (!ready) {
              toast.info("اول تاریخ ورود و خروج را انتخاب کن.");
              return;
            }
            if (user) book.mutate();
            else requireLogin();
          }}
        >
          {book.isPending && <Spinner />}
          {ready ? "رزرو و رفتن به پرداخت" : "تاریخ سفر را انتخاب کن"}
        </Button>
      )}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-firoozeh" />
        شب‌ها تا ۱۵ دقیقه برایت نگه داشته می‌شوند
      </p>

      <AlertDialog open={waitOffer} onOpenChange={setWaitOffer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>یک نفر زودتر رسید!</AlertDialogTitle>
            <AlertDialogDescription>
              همین الان بخشی از این شب‌ها رزرو شد. می‌توانی تاریخ را عوض کنی یا با پیش‌پرداخت در صف انتظار بمانی تا اگر آزاد شد،
              خودکار برای تو رزرو شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>تاریخ را عوض می‌کنم</AlertDialogCancel>
            <AlertDialogAction className="bg-anar hover:bg-anar/90" onClick={() => wait.mutate()}>
              در صف بمان
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
