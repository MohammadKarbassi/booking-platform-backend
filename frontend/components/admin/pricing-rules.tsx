"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { api, errorMessage } from "@/lib/api";
import { fa, isoDate, jDate, jDay, parseDate, priceSourceLabel, toman } from "@/lib/format";
import type { PricingRule, PricingRuleType } from "@/lib/types";
import { adminKeys, usePricingRules } from "@/components/admin/queries";
import { ListEmpty, ListError, PendingButton, RowsSkeleton, tomanToRial } from "@/components/admin/shared";

const RULE_TYPES: PricingRuleType[] = ["weekend", "holiday", "season", "long_stay", "last_minute", "early_bird"];

const RULE_HINT: Record<PricingRuleType, string> = {
  weekend: "شب‌های پنجشنبه و جمعه.",
  holiday: "شب‌هایی که در فهرست تعطیلات ثبت شده‌اند.",
  season: "همهٔ شب‌های بین تاریخ شروع و پایان.",
  long_stay: "وقتی مسافر دست‌کم چند شب بماند.",
  last_minute: "وقتی تا روز ورود حداکثر چند روز مانده باشد.",
  early_bird: "وقتی دست‌کم چند روز زودتر از ورود رزرو شود.",
};

function adjustmentText(r: Pick<PricingRule, "adjustment_type" | "value">) {
  const sign = r.value > 0 ? "+" : r.value < 0 ? "−" : "";
  const abs = Math.abs(r.value);
  return r.adjustment_type === "percent" ? `${sign}${fa(abs)}٪` : `${sign}${toman(abs)}`;
}

function conditionText(r: PricingRule) {
  if (r.rule_type === "season" && r.start_date && r.end_date) return `${jDay(r.start_date)} تا ${jDate(r.end_date)}`;
  if (r.rule_type === "long_stay" && r.min_nights) return `از ${fa(r.min_nights)} شب به بالا`;
  if (r.rule_type === "last_minute" && r.days_before_checkin != null)
    return `تا ${fa(r.days_before_checkin)} روز مانده به ورود`;
  if (r.rule_type === "early_bird" && r.days_before_checkin != null)
    return `دست‌کم ${fa(r.days_before_checkin)} روز پیش از ورود`;
  return "—";
}

export function PricingRules({ stayId }: { stayId: number }) {
  const rules = usePricingRules(stayId);
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: (v: { id: number; is_active: boolean }) =>
      api<PricingRule>(`/admin/pricing-rules/${v.id}`, { method: "PATCH", query: { is_active: v.is_active } }),
    onSuccess: (r) => {
      toast.success(r.is_active ? "قانون قیمت فعال شد." : "قانون قیمت غیرفعال شد.");
      qc.invalidateQueries({ queryKey: adminKeys.rules(stayId) });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="flex flex-col gap-8">
      {rules.isLoading ? (
        <RowsSkeleton rows={3} />
      ) : rules.isError ? (
        <ListError error={rules.error} onRetry={() => rules.refetch()} />
      ) : !rules.data?.length ? (
        <ListEmpty title="هنوز قانون قیمتی ندارد" description="همهٔ شب‌ها با قیمت پایه حساب می‌شوند. از فرم پایین اولین قانون را بساز." />
      ) : (
        <div className="overflow-hidden rounded-xl border-[1.5px] border-ink">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نوع</TableHead>
                <TableHead>تغییر قیمت</TableHead>
                <TableHead>شرط</TableHead>
                <TableHead>اولویت</TableHead>
                <TableHead>فعال</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.data.map((r) => {
                const busy = toggle.isPending && toggle.variables?.id === r.id;
                return (
                  <TableRow key={r.id} className={r.is_active ? "" : "opacity-60"}>
                    <TableCell className="font-semibold">{priceSourceLabel[r.rule_type] ?? r.rule_type}</TableCell>
                    <TableCell dir="ltr" className={r.value < 0 ? "text-end text-firoozeh" : "text-end text-anar"}>
                      {adjustmentText(r)}
                    </TableCell>
                    <TableCell>{conditionText(r)}</TableCell>
                    <TableCell>{fa(r.priority)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_active}
                        disabled={busy}
                        onCheckedChange={(c) => toggle.mutate({ id: r.id, is_active: c })}
                        aria-label={`${r.is_active ? "غیرفعال" : "فعال"} کردن قانون ${priceSourceLabel[r.rule_type]}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="-mt-5 text-xs text-muted-foreground">
        وقتی چند قانون روی یک شب صدق کند، قانون با اولویت بیشتر اعمال می‌شود. قانون‌ها حذف نمی‌شوند چون رزروهای قبلی به آن‌ها اشاره دارند؛ به‌جایش غیرفعالشان کن.
      </p>

      <RuleForm stayId={stayId} />
    </div>
  );
}

const optInt = z.string().trim().regex(/^\d*$/, { error: "یک عدد صحیح بنویس." });

const ruleSchema = z
  .object({
    rule_type: z.enum(["weekend", "holiday", "season", "long_stay", "last_minute", "early_bird"]),
    adjustment_type: z.enum(["percent", "fixed"]),
    direction: z.enum(["up", "down"]),
    amount: z.coerce.number<string>().positive({ error: "مقدار را بنویس؛ بیشتر از صفر." }),
    start_date: z.string(),
    end_date: z.string(),
    min_nights: optInt,
    days_before_checkin: optInt,
    priority: z.coerce.number<string>().int({ error: "اولویت باید عدد صحیح باشد." }),
    is_active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.rule_type === "season" && (!v.start_date || !v.end_date))
      ctx.addIssue({ code: "custom", path: ["start_date"], message: "بازهٔ فصل را روی تقویم انتخاب کن." });
    if (v.rule_type === "long_stay" && !(Number(v.min_nights) >= 1))
      ctx.addIssue({ code: "custom", path: ["min_nights"], message: "حداقل شب‌ها را بنویس (۱ یا بیشتر)." });
    if ((v.rule_type === "last_minute" || v.rule_type === "early_bird") && v.days_before_checkin === "")
      ctx.addIssue({ code: "custom", path: ["days_before_checkin"], message: "تعداد روز را بنویس." });
    if (v.adjustment_type === "percent" && v.direction === "down" && v.amount > 100)
      ctx.addIssue({ code: "custom", path: ["amount"], message: "تخفیف بیشتر از ۱۰۰٪ نمی‌شود." });
  });

type RuleIn = z.input<typeof ruleSchema>;
type RuleOut = z.output<typeof ruleSchema>;

const RULE_DEFAULTS: RuleIn = {
  rule_type: "weekend",
  adjustment_type: "percent",
  direction: "up",
  amount: "",
  start_date: "",
  end_date: "",
  min_nights: "",
  days_before_checkin: "",
  priority: "0",
  is_active: true,
};

function RuleForm({ stayId }: { stayId: number }) {
  const qc = useQueryClient();
  const [calOpen, setCalOpen] = useState(false);
  const { register, control, handleSubmit, formState, reset, setValue } = useForm<RuleIn, unknown, RuleOut>({
    resolver: zodResolver(ruleSchema),
    defaultValues: RULE_DEFAULTS,
  });
  const errors = formState.errors;
  const [type, adjType, start, end] = useWatch({ control, name: ["rule_type", "adjustment_type", "start_date", "end_date"] });

  const add = useMutation({
    mutationFn: (v: RuleOut) => {
      const magnitude = v.adjustment_type === "fixed" ? tomanToRial(v.amount) : Math.round(v.amount);
      return api<PricingRule>(`/admin/accommodations/${stayId}/pricing-rules`, {
        method: "POST",
        body: {
          rule_type: v.rule_type,
          adjustment_type: v.adjustment_type,
          value: v.direction === "down" ? -magnitude : magnitude,
          start_date: v.rule_type === "season" ? v.start_date : undefined,
          end_date: v.rule_type === "season" ? v.end_date : undefined,
          min_nights: v.rule_type === "long_stay" ? Number(v.min_nights) : undefined,
          days_before_checkin:
            v.rule_type === "last_minute" || v.rule_type === "early_bird" ? Number(v.days_before_checkin) : undefined,
          priority: v.priority,
          is_active: v.is_active,
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`قانون «${priceSourceLabel[r.rule_type]}» اضافه شد.`);
      qc.invalidateQueries({ queryKey: adminKeys.rules(stayId) });
      reset(RULE_DEFAULTS);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const selectCtl = <N extends "rule_type" | "adjustment_type" | "direction">(
    name: N,
    id: string,
    options: [string, string][],
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select dir="rtl" value={field.value} onValueChange={field.onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <form onSubmit={handleSubmit((v) => add.mutate(v))} noValidate className="rounded-xl bg-muted/60 p-4">
      <h3 className="mb-4 font-bold">افزودن قانون قیمت</h3>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <FieldLabel htmlFor="rule-type">نوع قانون</FieldLabel>
            {selectCtl(
              "rule_type",
              "rule-type",
              RULE_TYPES.map((t) => [t, priceSourceLabel[t]]),
            )}
            <FieldDescription>{RULE_HINT[type]}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="rule-dir">افزایش یا تخفیف</FieldLabel>
            {selectCtl("direction", "rule-dir", [
              ["up", "افزایش قیمت"],
              ["down", "تخفیف"],
            ])}
          </Field>
          <Field>
            <FieldLabel htmlFor="rule-adj">نوع تغییر</FieldLabel>
            {selectCtl("adjustment_type", "rule-adj", [
              ["percent", "درصدی"],
              ["fixed", "مبلغ ثابت"],
            ])}
          </Field>
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="rule-amount">{adjType === "percent" ? "مقدار (درصد)" : "مقدار هر شب (تومان)"}</FieldLabel>
            <Input id="rule-amount" type="number" min={1} aria-invalid={!!errors.amount} {...register("amount")} />
            <FieldError errors={[errors.amount]} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {type === "season" && (
            <Field data-invalid={!!errors.start_date} className="sm:col-span-2">
              <FieldLabel htmlFor="rule-season">بازهٔ فصل</FieldLabel>
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <Button id="rule-season" type="button" variant="outline" className="justify-start bg-card font-normal">
                    <CalendarRange />
                    {start && end ? `${jDate(start)} تا ${jDate(end)}` : "انتخاب روز اول و آخر فصل"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <JalaliCalendar
                    mode="range"
                    selected={{ from: start ? parseDate(start) : undefined, to: end ? parseDate(end) : undefined }}
                    onSelect={(r) => {
                      setValue("start_date", r?.from ? isoDate(r.from) : "", { shouldValidate: formState.isSubmitted });
                      setValue("end_date", r?.to ? isoDate(r.to) : "", { shouldValidate: formState.isSubmitted });
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <FieldError errors={[errors.start_date]} />
            </Field>
          )}
          {type === "long_stay" && (
            <Field data-invalid={!!errors.min_nights}>
              <FieldLabel htmlFor="rule-min">از چند شب به بالا</FieldLabel>
              <Input id="rule-min" type="number" min={1} aria-invalid={!!errors.min_nights} {...register("min_nights")} />
              <FieldError errors={[errors.min_nights]} />
            </Field>
          )}
          {(type === "last_minute" || type === "early_bird") && (
            <Field data-invalid={!!errors.days_before_checkin}>
              <FieldLabel htmlFor="rule-days">
                {type === "last_minute" ? "حداکثر روز مانده به ورود" : "دست‌کم چند روز پیش از ورود"}
              </FieldLabel>
              <Input
                id="rule-days"
                type="number"
                min={0}
                aria-invalid={!!errors.days_before_checkin}
                {...register("days_before_checkin")}
              />
              <FieldError errors={[errors.days_before_checkin]} />
            </Field>
          )}
          <Field data-invalid={!!errors.priority}>
            <FieldLabel htmlFor="rule-priority">اولویت</FieldLabel>
            <Input id="rule-priority" type="number" aria-invalid={!!errors.priority} {...register("priority")} />
            <FieldDescription>عدد بزرگ‌تر یعنی مهم‌تر.</FieldDescription>
            <FieldError errors={[errors.priority]} />
          </Field>
          <Field orientation="horizontal" className="self-center">
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => <Switch id="rule-active" checked={field.value} onCheckedChange={field.onChange} />}
            />
            <FieldLabel htmlFor="rule-active">از همین حالا فعال باشد</FieldLabel>
          </Field>
        </div>

        <div>
          <PendingButton type="submit" pending={add.isPending} className="h-10 rounded-full bg-lapis px-6">
            افزودن قانون
          </PendingButton>
        </div>
      </FieldGroup>
    </form>
  );
}
