"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError, api, errorMessage } from "@/lib/api";
import { bookingStatusLabel, fa, jDate, jDay, nightsBetween, toman } from "@/lib/format";
import type { Booking, BookingStatus } from "@/lib/types";
import { adminKeys, useAdminBookings } from "@/components/admin/queries";
import { BookingStatusBadge, ListEmpty, ListError, RowsSkeleton, SectionTitle } from "@/components/admin/shared";

const FILTERS: (BookingStatus | "all")[] = ["all", "pending_payment", "confirmed", "completed", "cancelled", "expired"];

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const bookings = useAdminBookings(filter === "all" ? undefined : filter);
  const list = bookings.data ?? [];

  return (
    <section>
      <SectionTitle title="رزروها" description="تازه‌ترین رزروها بالای فهرست‌اند. وقتی مسافر اقامتش را تمام کرد، رزرو را «تمام‌شده» کن تا بتواند نظر بدهد." />
      <ToggleGroup
        type="single"
        variant="outline"
        value={filter}
        onValueChange={(v) => v && setFilter(v as BookingStatus | "all")}
        aria-label="فیلتر وضعیت رزرو"
        className="mb-5 flex-wrap"
      >
        {FILTERS.map((f) => (
          <ToggleGroupItem
            key={f}
            value={f}
            className="rounded-full border-ink px-4 font-semibold data-[state=on]:bg-ink data-[state=on]:text-paper"
          >
            {f === "all" ? "همه" : bookingStatusLabel[f]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {bookings.isLoading ? (
        <RowsSkeleton rows={6} />
      ) : bookings.isError ? (
        <ListError error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : list.length === 0 ? (
        <ListEmpty
          title={filter === "all" ? "هنوز رزروی ثبت نشده" : `رزرو «${bookingStatusLabel[filter]}» نداریم`}
          description={filter === "all" ? undefined : "فیلتر دیگری را امتحان کن."}
        />
      ) : (
        <div className="journal-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>اقامتگاه</TableHead>
                <TableHead>مسافر</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>شب</TableHead>
                <TableHead>مبلغ کل</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((b) => (
                <TableRow key={b.id}>
                  <TableCell dir="ltr" className="text-end font-mono text-xs font-bold">
                    {b.booking_code}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{b.accommodation_title}</div>
                    <div className="text-xs text-muted-foreground">{b.city}</div>
                  </TableCell>
                  <TableCell>
                    <div>{b.guest.name || "بی‌نام"}</div>
                    <div dir="ltr" className="text-end text-xs text-muted-foreground">
                      {b.guest.phone}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {jDay(b.check_in)} تا {jDate(b.check_out)}
                  </TableCell>
                  <TableCell>{fa(b.nights.length || nightsBetween(b.check_in, b.check_out))}</TableCell>
                  <TableCell className="whitespace-nowrap">{toman(b.total_price)}</TableCell>
                  <TableCell>
                    <BookingStatusBadge status={b.status} />
                  </TableCell>
                  <TableCell>{b.status === "confirmed" && <CompleteButton booking={b} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function CompleteButton({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const complete = useMutation({
    mutationFn: () => api<Booking>(`/admin/bookings/${booking.id}/complete`, { method: "POST" }),
    onSuccess: () => {
      toast.success(`اقامت رزرو ${booking.booking_code} تمام‌شده ثبت شد. حالا مسافر می‌تواند نظر بدهد.`);
      qc.invalidateQueries({ queryKey: adminKeys.bookings });
      setOpen(false);
    },
    onError: (e) =>
      toast.error(
        // the backend answers 409 "Booking is <status>", which the shared translator reads as a payment error
        e instanceof ApiError && e.status === 409 ? "فقط رزرو قطعی را می‌شود تمام‌شده ثبت کرد." : errorMessage(e),
      ),
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full border-ink font-bold whitespace-nowrap">
          <CheckCheck /> اقامت تمام شد
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>اقامت {booking.guest.name || "این مسافر"} تمام شد؟</AlertDialogTitle>
          <AlertDialogDescription>
            رزرو {booking.booking_code} در «{booking.accommodation_title}» ({jDay(booking.check_in)} تا {jDate(booking.check_out)})
            تمام‌شده ثبت می‌شود و مسافر می‌تواند برایش نظر بنویسد. این کار برگشت ندارد.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>منصرف شدم</AlertDialogCancel>
          <AlertDialogAction
            disabled={complete.isPending}
            onClick={(e) => {
              e.preventDefault();
              complete.mutate();
            }}
          >
            {complete.isPending && <Spinner />}
            ثبت پایان اقامت
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
