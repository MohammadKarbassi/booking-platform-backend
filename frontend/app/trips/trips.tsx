"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Luggage, Receipt, Star } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Postmark } from "@/components/postmark";
import { api, errorMessage } from "@/lib/api";
import { displayName, useAuth } from "@/lib/auth";
import { bookingStatusLabel, fa, jDay, jShort, jWeekday, parseDate, toman, today } from "@/lib/format";
import { startPayment } from "@/lib/payments";
import { useProvinces, useStay } from "@/lib/queries";
import type { Booking, BookingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending_payment: "bg-saffron text-ink",
  confirmed: "bg-firoozeh text-white",
  completed: "bg-lapis text-white",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

const STAMP_COLORS = ["var(--anar)", "var(--lapis)", "var(--firoozeh)", "#6b3fa0", "#b06d00"];

/** One stamp per trip that actually happens; provinces come from each stay's detail. */
function StampFor({ b, i }: { b: Booking; i: number }) {
  return (
    <div className="grid place-items-center" style={{ transform: `rotate(${((i * 37) % 24) - 12}deg)` }}>
      <Postmark city={b.city} date={jShort(b.check_in)} waves={false} color={STAMP_COLORS[i % STAMP_COLORS.length]} className="w-28" />
    </div>
  );
}

function ProvinceOf({ id }: { id: number }) {
  const s = useStay(id);
  return s.data ? <>{s.data.province}</> : null;
}

function Passport({ bookings }: { bookings: Booking[] }) {
  const { user } = useAuth();
  const provinces = useProvinces();
  const trips = bookings.filter((b) => b.status === "confirmed" || b.status === "completed");
  const stays = [...new Set(trips.map((b) => b.accommodation_id))];
  const cities = new Set(trips.map((b) => b.city));
  return (
    <section className="journal relative overflow-hidden p-6 sm:p-8" aria-label="گذرنامهٔ سفر">
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <div>
          <p className="text-sm font-bold text-anar">گذرنامهٔ دور ایران</p>
          <h1 className="text-display mt-1 text-5xl text-ink">سفرنامهٔ {user ? displayName(user) : "من"}</h1>
          <p className="mt-4 text-5xl font-black text-lapis">
            {fa(cities.size)}
            <span className="ms-2 text-base font-semibold text-muted-foreground">شهر را دور زده‌ای</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            استان‌ها:{" "}
            {stays.length ? (
              stays.map((id, i) => (
                <span key={id}>
                  {i > 0 && "، "}
                  <ProvinceOf id={id} />
                </span>
              ))
            ) : (
              "هنوز هیچ"
            )}
            {provinces.data && `، ایران ${fa(31)} استان دارد`}
          </p>
        </div>
        <div className="min-h-40 rounded-xl border-2 border-dashed border-ink/20 bg-[radial-gradient(rgb(23_32_61/0.06)_1px,transparent_1px)] [background-size:14px_14px] p-4">
          {trips.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {trips.map((b, i) => <StampFor key={b.id} b={b} i={i} />)}
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center text-muted-foreground">
              <p>
                این صفحه منتظر اولین مهر است.
                <br />
                <Link href="/stays" className="font-bold text-lapis underline-offset-4 hover:underline">
                  یک مقصد پیدا کن
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewDialog({ b }: { b: Booking }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const send = useMutation({
    mutationFn: () => api(`/bookings/${b.id}/review`, { method: "POST", body: { rating, comment: comment.trim() || null } }),
    onSuccess: () => {
      toast.success("نظرت ثبت شد؛ بعد از تأیید، روی صفحهٔ اقامتگاه می‌آید.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-saffron font-bold text-ink hover:bg-saffron/90">
          <Star /> نوشتن سفرنامه
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-display text-2xl">از {b.accommodation_title} بنویس</DialogTitle>
          <DialogDescription>نظرت به مسافرهای بعدی کمک می‌کند. بعد از تأیید مدیر منتشر می‌شود.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">چند ستاره؟</Label>
            <div className="flex gap-1" role="radiogroup" aria-label="امتیاز" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${fa(n)} ستاره`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  className="rounded p-0.5"
                >
                  <Star className={cn("size-8 transition", n <= (hover || rating) ? "fill-saffron text-saffron" : "text-ink/20")} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor={`c-${b.id}`} className="mb-2 block">چه دیدی؟ چه حسی داشت؟</Label>
            <Textarea id={`c-${b.id}`} rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="از صبح اول، از میزبان، از جاهای دیدنی اطراف…" />
          </div>
        </div>
        <DialogFooter>
          <Button className="bg-lapis font-bold" disabled={send.isPending} onClick={() => send.mutate()}>
            {send.isPending && <Spinner />} ثبت نظر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ b }: { b: Booking }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Receipt /> رسید
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>رسید رزرو <span dir="ltr" className="font-mono">{b.booking_code}</span></DialogTitle>
          <DialogDescription>{b.accommodation_title}، {fa(b.guests_count)} مسافر</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-sm">
          {b.nights.map((n) => (
            <li key={n.night} className="flex justify-between"><span>{jWeekday(n.night)}</span><span>{toman(n.price)}</span></li>
          ))}
          {!b.nights.length && <li className="text-muted-foreground">شب‌های این رزرو آزاد شده‌اند.</li>}
        </ul>
        <div className="flex justify-between border-t pt-3 font-bold"><span>جمع</span><span>{toman(b.total_price)}</span></div>
        {b.payments.length > 0 && (
          <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold">پرداخت‌ها</p>
            {b.payments.map((p) => (
              <p key={p.id} className="flex justify-between">
                <span>{toman(p.amount)}</span>
                <span>{{ initiated: "شروع شده", success: "موفق", failed: "ناموفق", refunded: "برگشت داده شد" }[p.status]}{p.ref_id && `، ${p.ref_id}`}</span>
              </p>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TripCard({ b }: { b: Booking }) {
  const router = useRouter();
  const qc = useQueryClient();
  const upcoming = parseDate(b.check_in) > today();
  const pay = useMutation({
    mutationFn: () => startPayment({ booking_id: b.id }),
    onSuccess: (url) => router.push(url),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: () => api<Booking>(`/bookings/${b.id}/cancel`, { method: "POST" }),
    onSuccess: (r) => {
      toast.success(
        r.payments.some((p) => p.status === "refunded") ? "رزرو لغو شد و مبلغ برگشت داده شد." : "رزرو لغو شد.",
      );
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <li className="journal-sm flex flex-col gap-4 p-4 sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.cover_image ?? ""} alt="" className="h-32 w-full shrink-0 rounded-lg object-cover sm:h-28 sm:w-40" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={STATUS_STYLE[b.status]}>{bookingStatusLabel[b.status]}</Badge>
          <span dir="ltr" className="font-mono text-xs text-muted-foreground">{b.booking_code}</span>
        </div>
        <h3 className="text-display mt-1 text-2xl text-ink">
          <Link href={`/stays/${b.accommodation_id}`} className="hover:underline">{b.accommodation_title}</Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4" /> {jDay(b.check_in)} تا {jDay(b.check_out)}، {fa(b.guests_count)} نفر، {toman(b.total_price)}
        </p>
        {b.review && (
          <p className="mt-1 text-sm text-muted-foreground">
            نظرت: {fa(b.review.rating)} ستاره، {{ pending: "در انتظار تأیید", approved: "منتشر شد", rejected: "منتشر نشد" }[b.review.status]}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
        {b.status === "pending_payment" && (
          <Button size="sm" className="bg-lapis font-bold" disabled={pay.isPending} onClick={() => pay.mutate()}>
            {pay.isPending && <Spinner />} پرداخت
          </Button>
        )}
        {b.status === "completed" && !b.review && <ReviewDialog b={b} />}
        {(b.status === "pending_payment" || b.status === "confirmed") && upcoming && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-anar">لغو رزرو</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>این سفر لغو شود؟</AlertDialogTitle>
                <AlertDialogDescription>
                  شب‌های {b.accommodation_title} آزاد می‌شوند و اگر پرداخت کرده‌ای، کل مبلغ برمی‌گردد. اگر کسی در صف انتظار باشد،
                  این شب‌ها خودکار به او می‌رسد.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>نه، نگهش دار</AlertDialogCancel>
                <AlertDialogAction className="bg-anar hover:bg-anar/90" onClick={() => cancel.mutate()}>
                  بله، لغو کن
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <ReceiptDialog b={b} />
      </div>
    </li>
  );
}

export function Trips() {
  const q = useQuery({ queryKey: ["my-bookings"], queryFn: () => api<Booking[]>("/bookings/me") });
  const all = q.data ?? [];
  const groups = {
    upcoming: all.filter((b) => b.status === "confirmed"),
    pending: all.filter((b) => b.status === "pending_payment"),
    past: all.filter((b) => b.status === "completed"),
    closed: all.filter((b) => b.status === "cancelled" || b.status === "expired"),
  };
  const tabs = [
    { key: "upcoming", label: "پیش رو" },
    { key: "pending", label: "منتظر پرداخت" },
    { key: "past", label: "سفرهای گذشته" },
    { key: "closed", label: "لغو و منقضی" },
  ] as const;
  const firstNonEmpty = tabs.find((t) => groups[t.key].length)?.key ?? "upcoming";

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      {q.isLoading ? <Skeleton className="h-56" /> : <Passport bookings={all} />}

      {q.isError ? (
        <p className="text-anar">{errorMessage(q.error)}</p>
      ) : q.isLoading ? (
        <Skeleton className="h-40" />
      ) : !all.length ? (
        <Empty className="journal py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Luggage /></EmptyMedia>
            <EmptyTitle className="text-display text-3xl">هنوز سفری نرفته‌ای</EmptyTitle>
            <EmptyDescription>اولین کارت‌پستال را انتخاب کن؛ بقیه‌اش با ما.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="bg-lapis font-bold"><Link href="/stays">کشف اقامتگاه‌ها</Link></Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Tabs defaultValue={firstNonEmpty} key={firstNonEmpty}>
          <TabsList className="h-auto max-w-full justify-start overflow-x-auto rounded-full border-[1.5px] border-ink bg-card p-1">
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="rounded-full px-4 data-[state=active]:bg-ink data-[state=active]:text-paper">
                {t.label} {groups[t.key].length > 0 && `(${fa(groups[t.key].length)})`}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-6">
              {groups[t.key].length ? (
                <ul className="space-y-4">{groups[t.key].map((b) => <TripCard key={b.id} b={b} />)}</ul>
              ) : (
                <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">این‌جا خالی است.</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
