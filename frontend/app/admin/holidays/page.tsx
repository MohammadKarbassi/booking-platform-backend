"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { api, errorMessage } from "@/lib/api";
import { isoDate, jDate, jWeekday, parseDate, today } from "@/lib/format";
import type { Holiday } from "@/lib/types";
import { adminKeys, useHolidays } from "@/components/admin/queries";
import { ListEmpty, ListError, PendingButton, RowsSkeleton, SectionTitle } from "@/components/admin/shared";
import { cn } from "@/lib/utils";

const schema = z.object({
  date: z.string().min(1, { error: "روز تعطیل را روی تقویم انتخاب کن." }),
  title: z.string().trim().min(2, { error: "عنوان تعطیلی را بنویس؛ مثل «نوروز»." }).max(150),
  is_official: z.boolean(),
});
type HolidayForm = z.infer<typeof schema>;

export default function AdminHolidaysPage() {
  const holidays = useHolidays();
  const qc = useQueryClient();
  const { register, control, handleSubmit, formState, reset } = useForm<HolidayForm>({
    resolver: zodResolver(schema),
    defaultValues: { date: "", title: "", is_official: true },
  });
  const errors = formState.errors;
  const todayIso = isoDate(today());

  const add = useMutation({
    mutationFn: (v: HolidayForm) => api<Holiday>("/admin/holidays", { method: "POST", body: v }),
    onSuccess: (h) => {
      toast.success(`${jDate(h.date)} با عنوان «${h.title}» ثبت شد.`);
      qc.invalidateQueries({ queryKey: adminKeys.holidays });
      reset();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <section>
        <SectionTitle
          title="تعطیلات"
          description="قانون قیمت «تعطیلی رسمی» روی شب‌های همین فهرست اعمال می‌شود. ثبت دوباره یک روز، عنوانش را عوض می‌کند."
        />
        {holidays.isLoading ? (
          <RowsSkeleton rows={5} />
        ) : holidays.isError ? (
          <ListError error={holidays.error} onRetry={() => holidays.refetch()} />
        ) : !holidays.data?.length ? (
          <ListEmpty title="هنوز تعطیلی ثبت نشده" description="از فرم کنار، اولین روز تعطیل را اضافه کن." />
        ) : (
          <div className="journal-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>عنوان</TableHead>
                  <TableHead>نوع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.data.map((h) => (
                  <TableRow key={h.date} className={cn(h.date < todayIso && "opacity-55")}>
                    <TableCell>
                      <div className="font-semibold">{jDate(h.date)}</div>
                      <div className="text-xs text-muted-foreground">{jWeekday(h.date).split(" ")[0]}</div>
                    </TableCell>
                    <TableCell>{h.title}</TableCell>
                    <TableCell>
                      <Badge className={h.is_official ? "bg-anar/10 text-anar" : "bg-ink/10 text-ink/70"}>
                        {h.is_official ? "رسمی" : "غیررسمی"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Card className="journal lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="text-display text-2xl">روز تعطیل تازه</CardTitle>
          <CardDescription>روز را روی تقویم بزن، عنوانش را بنویس و ثبت کن.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => add.mutate(v))} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.date}>
                <FieldLabel>روز</FieldLabel>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <>
                      <JalaliCalendar
                        mode="single"
                        selected={field.value ? parseDate(field.value) : undefined}
                        onSelect={(d) => field.onChange(d ? isoDate(d) : "")}
                        className="w-fit rounded-lg border bg-card"
                      />
                      <FieldDescription>{field.value ? `انتخاب: ${jWeekday(field.value)}` : "هنوز روزی انتخاب نشده."}</FieldDescription>
                    </>
                  )}
                />
                <FieldError errors={[errors.date]} />
              </Field>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="holiday-title">عنوان</FieldLabel>
                <Input id="holiday-title" placeholder="نوروز" aria-invalid={!!errors.title} {...register("title")} />
                <FieldError errors={[errors.title]} />
              </Field>
              <Field orientation="horizontal">
                <Controller
                  control={control}
                  name="is_official"
                  render={({ field }) => <Switch id="holiday-official" checked={field.value} onCheckedChange={field.onChange} />}
                />
                <FieldLabel htmlFor="holiday-official">تعطیل رسمی است</FieldLabel>
              </Field>
              <PendingButton type="submit" pending={add.isPending} className="h-10 rounded-full bg-lapis">
                ثبت روز تعطیل
              </PendingButton>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
