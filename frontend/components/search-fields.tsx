"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays, Check, MapPin, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { fa, jDay, nightsBetween, isoDate, parseDate, today } from "@/lib/format";
import { useCities, useProvinces } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useMedia } from "@/hooks/use-media";

/** Button-shaped field used inside the search bar: small label on top, value below. */
export function FieldButton({
  label,
  value,
  placeholder,
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<"button"> & { label: string; value?: string; placeholder: string; icon: React.ElementType }) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors hover:bg-ink/5 focus-visible:bg-ink/5",
        className,
      )}
      {...props}
    >
      <Icon className="size-5 shrink-0 text-lapis" aria-hidden />
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted-foreground">{label}</span>
        <span className={cn("block truncate font-semibold", !value && "text-muted-foreground/80")}>
          {value || placeholder}
        </span>
      </span>
    </button>
  );
}

export function CityPicker({
  value,
  onChange,
  className,
}: {
  value?: number;
  onChange: (id: number | undefined) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const cities = useCities();
  const provinces = useProvinces();
  const selected = cities.data?.find((c) => c.id === value);
  const groups = useMemo(
    () =>
      (provinces.data ?? [])
        .map((p) => ({ p, cities: (cities.data ?? []).filter((c) => c.province_id === p.id) }))
        .filter((g) => g.cities.length),
    [cities.data, provinces.data],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldButton label="مقصد" icon={MapPin} value={selected?.name} placeholder="کجا برویم؟" className={className} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="نام شهر یا روستا…" />
          <CommandList>
            <CommandEmpty>این‌جا هنوز اقامتگاهی نداریم.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                همه‌جای ایران
                <Check className={cn("ms-auto", value ? "opacity-0" : "opacity-100")} />
              </CommandItem>
            </CommandGroup>
            {groups.map((g) => (
              <CommandGroup key={g.p.id} heading={g.p.name}>
                {g.cities.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.name} ${g.p.name}`}
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    {c.name}
                    <Check className={cn("ms-auto", value === c.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type Dates = { check_in?: string; check_out?: string };

export function DatesPicker({
  value,
  onChange,
  className,
  disabled,
  booked,
  minNights = 1,
  open: controlledOpen,
  onOpenChange,
}: {
  value: Dates;
  onChange: (d: Dates) => void;
  className?: string;
  disabled?: (d: Date) => boolean;
  /** nights that are taken: still selectable (for the waitlist) but struck through */
  booked?: Date[];
  minNights?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const wide = useMedia("(min-width: 768px)");
  const range: DateRange | undefined = value.check_in
    ? { from: parseDate(value.check_in), to: value.check_out ? parseDate(value.check_out) : undefined }
    : undefined;
  const label =
    value.check_in && value.check_out
      ? `${jDay(value.check_in)} تا ${jDay(value.check_out)}`
      : value.check_in
        ? `از ${jDay(value.check_in)}`
        : undefined;
  const nights = value.check_in && value.check_out ? nightsBetween(value.check_in, value.check_out) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldButton label="تاریخ سفر" icon={CalendarDays} value={label} placeholder="ورود و خروج" className={className} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <JalaliCalendar
          mode="range"
          numberOfMonths={wide ? 2 : 1}
          selected={range}
          defaultMonth={range?.from ?? today()}
          min={minNights}
          disabled={(d) => d < today() || Boolean(disabled?.(d))}
          modifiers={{ booked: booked ?? [] }}
          modifiersClassNames={{ booked: "[&>button]:line-through [&>button]:text-anar [&>button]:decoration-2" }}
          onSelect={(r) => {
            const next = { check_in: r?.from ? isoDate(r.from) : undefined, check_out: r?.to ? isoDate(r.to) : undefined };
            if (next.check_in && next.check_in === next.check_out) next.check_out = undefined;
            onChange(next);
            if (next.check_in && next.check_out) setOpen(false);
          }}
          className="[--cell-size:--spacing(9)]"
        />
        {booked && booked.length > 0 && (
          <p className="px-4 pb-2 text-xs text-muted-foreground">
            روزهای <span className="font-bold text-anar line-through">خط‌خورده</span> پر هستند؛ اگر انتخابشان کنی،
            می‌توانی در صف انتظار بمانی.
          </p>
        )}
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">
            {nights ? `${fa(nights)} شب` : value.check_in ? "روز خروج را انتخاب کن" : "روز ورود را انتخاب کن"}
          </span>
          {value.check_in && (
            <Button variant="ghost" size="sm" onClick={() => onChange({})}>
              پاک کردن
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function GuestsPicker({
  value,
  onChange,
  max = 16,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FieldButton label="مسافران" icon={Users} value={`${fa(value)} نفر`} placeholder="" className={className} />
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">تعداد مسافران</div>
            <div className="text-xs text-muted-foreground">بزرگسال و کودک</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="size-8 rounded-full"
              aria-label="یک نفر بیشتر"
              disabled={value >= max}
              onClick={() => onChange(value + 1)}
            >
              <Plus />
            </Button>
            <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">
              {fa(value)}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="size-8 rounded-full"
              aria-label="یک نفر کمتر"
              disabled={value <= 1}
              onClick={() => onChange(value - 1)}
            >
              <Minus />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
