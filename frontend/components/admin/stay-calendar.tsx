"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { ApiError, api, errorMessage } from "@/lib/api";
import { addDays, fa, isoDate, jDay, jWeekday, today, tomanShort } from "@/lib/format";
import type { StayDetail } from "@/lib/types";
import { adminKeys, useStayCalendar } from "@/components/admin/queries";
import { ListError, PendingButton, tomanToRial } from "@/components/admin/shared";
import { cn } from "@/lib/utils";

export function StayCalendar({ stay }: { stay: StayDetail }) {
  const qc = useQueryClient();
  const [range, setRange] = useState<DateRange | undefined>();
  const [price, setPrice] = useState("");
  const [blocked, setBlocked] = useState(false);

  const from = range?.from;
  const last = range?.to ?? range?.from;
  const days = from && last ? Math.round((last.getTime() - from.getTime()) / 86_400_000) + 1 : 0;
  const priceNum = price.trim() ? Number(price) : undefined;
  const priceInvalid = priceNum !== undefined && !(priceNum > 0);

  const apply = useMutation({
    mutationFn: () =>
      api<{ updated_days: number }>(`/admin/accommodations/${stay.id}/calendar`, {
        method: "PUT",
        body: {
          start: isoDate(from!),
          end: isoDate(addDays(last!, 1)), // the API takes an exclusive end
          price_override: priceNum !== undefined ? tomanToRial(priceNum) : null,
          is_blocked: blocked,
        },
      }),
    onSuccess: (r) => {
      toast.success(`${fa(r.updated_days)} روز به‌روز شد.`);
      qc.invalidateQueries({ queryKey: adminKeys.calendar(stay.id) });
      qc.invalidateQueries({ queryKey: ["calendar", stay.id] });
      setRange(undefined);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col gap-4">
        <div className="journal-sm w-fit p-2">
          <JalaliCalendar
            mode="range"
            selected={range}
            onSelect={setRange}
            disabled={{ before: today() }}
            className="bg-transparent [--cell-size:--spacing(9)]"
          />
        </div>
        <p className="text-sm text-ink/80" aria-live="polite">
          {from && last
            ? from.getTime() === last.getTime()
              ? `انتخاب: ${jWeekday(from)}`
              : `انتخاب: ${jDay(from)} تا ${jDay(last)} (${fa(days)} روز)`
            : "روز اول و آخر بازه را روی تقویم بزن."}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <FieldGroup>
          <Field data-invalid={priceInvalid}>
            <FieldLabel htmlFor="cal-price">قیمت ویژهٔ هر شب (تومان)</FieldLabel>
            <Input
              id="cal-price"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`قیمت پایه: ${tomanShort(stay.base_price_per_night)} تومان`}
              aria-invalid={priceInvalid}
              className="max-w-xs"
            />
            <FieldDescription>
              خالی بگذار تا قیمت پایه و قانون‌های قیمت اعمال شوند. اگر خالی باشد و روزها را نبندی، تنظیم قبلی این روزها پاک می‌شود.
            </FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <Switch id="cal-blocked" checked={blocked} onCheckedChange={setBlocked} />
            <FieldLabel htmlFor="cal-blocked">این روزها بسته باشند (رزرو نشوند)</FieldLabel>
          </Field>
          <div>
            <PendingButton
              pending={apply.isPending}
              disabled={!from || priceInvalid}
              onClick={() => apply.mutate()}
              className="journal-sm journal-press h-10 rounded-full bg-lapis px-6"
            >
              {days ? `اعمال روی ${fa(days)} روز انتخاب‌شده` : "اول روزها را انتخاب کن"}
            </PendingButton>
          </div>
        </FieldGroup>

        <NextDays stay={stay} />
      </div>
    </div>
  );
}

function NextDays({ stay }: { stay: StayDetail }) {
  const start = isoDate(today());
  const active = stay.status === "active";
  const cal = useStayCalendar(stay.id, start, active);

  return (
    <div>
      <h3 className="font-bold">۶۰ روز آینده</h3>
      <div className="mt-1 mb-3 flex flex-wrap gap-4 text-xs text-ink/75">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-firoozeh/20 ring-1 ring-firoozeh" /> آزاد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-anar/15 ring-1 ring-anar" /> بسته یا رزروشده
        </span>
      </div>
      {!active ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-ink/80">
          نمای روزها فقط برای اقامتگاه «فعال» در دسترس است. وضعیت را فعال کن تا روزها را این‌جا ببینی؛ تنظیم قیمت و بستن روزها همین حالا هم کار می‌کند.
        </p>
      ) : cal.isLoading ? (
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: 20 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : cal.isError ? (
        cal.error instanceof ApiError && cal.error.status === 404 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-ink/80">این اقامتگاه هنوز در سایت فعال نیست، پس نمای روزها در دسترس نیست.</p>
        ) : (
          <ListError error={cal.error} onRetry={() => cal.refetch()} />
        )
      ) : (
        <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {cal.data?.map((d) => (
            <li
              key={d.date}
              title={`${jWeekday(d.date)}: ${d.available ? "آزاد" : "بسته یا رزروشده"}`}
              className={cn(
                "rounded-md px-1 py-1.5 text-center text-[11px] leading-tight ring-1",
                d.available ? "bg-firoozeh/10 ring-firoozeh/60" : "bg-anar/10 text-anar ring-anar/60",
                d.price !== stay.base_price_per_night && "font-bold",
              )}
            >
              <div>{jDay(d.date)}</div>
              <div className="mt-0.5 opacity-80">{tomanShort(d.price)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
