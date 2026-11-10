"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { useCities, usePoiCategories } from "@/lib/queries";
import { PendingButton, SectionTitle } from "@/components/admin/shared";

const schema = z.object({
  category_id: z.coerce.number<string>().int().positive({ error: "دسته را انتخاب کن." }),
  city_id: z.coerce.number<string>().int().positive({ error: "شهر را انتخاب کن." }),
  name: z.string().trim().min(2, { error: "نام جاذبه را بنویس." }).max(200),
  latitude: z.coerce
    .number<string>({ error: "عرض جغرافیایی را عددی بنویس." })
    .min(-90, { error: "عرض جغرافیایی بین ۹۰- و ۹۰ است." })
    .max(90, { error: "عرض جغرافیایی بین ۹۰- و ۹۰ است." })
    .refine((n) => n !== 0, { error: "عرض جغرافیایی را بنویس." }),
  longitude: z.coerce
    .number<string>({ error: "طول جغرافیایی را عددی بنویس." })
    .min(-180, { error: "طول جغرافیایی بین ۱۸۰- و ۱۸۰ است." })
    .max(180, { error: "طول جغرافیایی بین ۱۸۰- و ۱۸۰ است." })
    .refine((n) => n !== 0, { error: "طول جغرافیایی را بنویس." }),
  description: z.string(),
});
type In = z.input<typeof schema>;
type Out = z.output<typeof schema>;

const DEFAULTS: In = { category_id: "", city_id: "", name: "", latitude: "", longitude: "", description: "" };

export default function AdminPlacesPage() {
  const cities = useCities();
  const categories = usePoiCategories();
  const { register, control, handleSubmit, formState, reset } = useForm<In, unknown, Out>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const errors = formState.errors;

  const add = useMutation({
    mutationFn: (v: Out) =>
      api<{ id: number; name: string }>("/admin/points-of-interest", {
        method: "POST",
        body: { ...v, description: v.description.trim() || undefined },
      }),
    onSuccess: (p) => {
      toast.success(`جاذبهٔ «${p.name}» ثبت شد و در قطب‌نمای اقامتگاه‌های نزدیکش دیده می‌شود.`);
      reset(DEFAULTS);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const select = (name: "category_id" | "city_id", label: string, placeholder: string, options?: { id: number; name: string }[]) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`poi-${name}`}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select dir="rtl" value={String(field.value ?? "")} onValueChange={field.onChange}>
            <SelectTrigger id={`poi-${name}`} className="w-full" aria-invalid={!!errors[name]}>
              <SelectValue placeholder={options ? placeholder : "در حال بارگذاری…"} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError errors={[errors[name]]} />
    </Field>
  );

  return (
    <section className="max-w-3xl">
      <SectionTitle
        title="جاذبه‌ها"
        description="جاذبه‌ها در قطب‌نمای کشفِ هر اقامتگاه نشان داده می‌شوند؛ فاصله از روی مختصات حساب می‌شود."
      />
      <Card className="journal">
        <CardHeader>
          <CardTitle className="text-display text-2xl">جاذبهٔ تازه</CardTitle>
          <CardDescription>آبشار، بازار، موزه یا هر جای دیدنی نزدیک اقامتگاه‌ها.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => add.mutate(v))} noValidate>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                {select("category_id", "دسته", "دسته را انتخاب کن", categories.data)}
                {select("city_id", "شهر", "شهر را انتخاب کن", cities.data)}
              </div>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="poi-name">نام</FieldLabel>
                <Input id="poi-name" placeholder="آبشار ویسادار" aria-invalid={!!errors.name} {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.latitude}>
                  <FieldLabel htmlFor="poi-lat">عرض جغرافیایی (lat)</FieldLabel>
                  <Input id="poi-lat" dir="ltr" inputMode="decimal" placeholder="37.0412" aria-invalid={!!errors.latitude} {...register("latitude")} />
                  <FieldError errors={[errors.latitude]} />
                </Field>
                <Field data-invalid={!!errors.longitude}>
                  <FieldLabel htmlFor="poi-lng">طول جغرافیایی (lng)</FieldLabel>
                  <Input id="poi-lng" dir="ltr" inputMode="decimal" placeholder="49.6532" aria-invalid={!!errors.longitude} {...register("longitude")} />
                  <FieldError errors={[errors.longitude]} />
                </Field>
              </div>
              <FieldDescription className="-mt-2">
                مختصات را به درجهٔ اعشاری بنویس، نه درجه و دقیقه. در گوگل‌مپ روی نقطه راست‌کلیک کن؛ عدد اول عرض و عدد دوم طول است. برای ایران عرض حدود ۲۵ تا ۴۰ و طول حدود ۴۴ تا ۶۳ است.
              </FieldDescription>
              <Field>
                <FieldLabel htmlFor="poi-desc">توضیح کوتاه (اختیاری)</FieldLabel>
                <Textarea id="poi-desc" rows={3} {...register("description")} />
              </Field>
              <div>
                <PendingButton type="submit" pending={add.isPending} className="journal-sm journal-press h-10 rounded-full bg-lapis px-6">
                  ثبت جاذبه
                </PendingButton>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
