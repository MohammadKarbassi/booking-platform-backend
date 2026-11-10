"use client";

import { CircleAlert, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api";
import type { AccommodationStatus, BookingStatus } from "@/lib/types";
import { bookingStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export const stayStatusLabel: Record<AccommodationStatus, string> = {
  draft: "پیش‌نویس",
  active: "فعال",
  inactive: "غیرفعال",
};

const stayStatusClass: Record<AccommodationStatus, string> = {
  draft: "bg-saffron/25 text-ink",
  active: "bg-firoozeh/15 text-firoozeh",
  inactive: "bg-ink/10 text-ink/70",
};

export function StayStatusBadge({ status }: { status: AccommodationStatus }) {
  return <Badge className={cn("font-semibold", stayStatusClass[status])}>{stayStatusLabel[status]}</Badge>;
}

const bookingStatusClass: Record<BookingStatus, string> = {
  pending_payment: "bg-saffron/25 text-ink",
  confirmed: "bg-lapis/10 text-lapis",
  cancelled: "bg-anar/10 text-anar",
  expired: "bg-ink/10 text-ink/70",
  completed: "bg-firoozeh/15 text-firoozeh",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge className={cn("font-semibold", bookingStatusClass[status])}>{bookingStatusLabel[status] ?? status}</Badge>
  );
}

export function ListError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Alert variant="destructive" className="journal-sm">
      <CircleAlert />
      <AlertTitle>فهرست بارگذاری نشد</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            دوباره بارگذاری کن
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ListEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <Empty className="border-2 border-ink/20 bg-card/60">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}

export function RowsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** Submit button that shows a spinner and stays disabled while the mutation runs. */
export function PendingButton({
  pending,
  children,
  className,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button disabled={pending || disabled} className={cn("font-bold", className)} {...props}>
      {pending && <Spinner />}
      {children}
    </Button>
  );
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-display text-3xl text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Toman typed by the admin → Rial for the API. */
export const tomanToRial = (t: number) => Math.round(t * 10);
