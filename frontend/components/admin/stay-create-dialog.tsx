"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { useAmenities, useCities, useTypes } from "@/lib/queries";
import type { StayCard } from "@/lib/types";
import { adminKeys, useHosts } from "@/components/admin/queries";
import { PendingButton, stayStatusLabel, tomanToRial } from "@/components/admin/shared";

const pick = (msg: string) => z.coerce.number<string>().int().positive({ error: msg });
const count = (min: number, msg: string) => z.coerce.number<string>({ error: msg }).int({ error: msg }).min(min, { error: msg });

const schema = z
  .object({
    host_id: pick("میزبان را انتخاب کن."),
    type_id: pick("نوع اقامتگاه را انتخاب کن."),
    city_id: pick("شهر را انتخاب کن."),
    title: z.string().trim().min(3, { error: "عنوان را بنویس (دست‌کم ۳ حرف)." }).max(200),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, { error: "فقط حروف کوچک انگلیسی، عدد و خط تیره؛ مثل ramsar-villa." })
      .max(220),
    description: z.string().optional(),
    address: z.string().trim().min(5, { error: "نشانی را کامل بنویس." }),
    latitude: z.coerce.number<string>({ error: "عرض جغرافیایی را عددی بنویس." }).min(-90).max(90),
    longitude: z.coerce.number<string>({ error: "طول جغرافیایی را عددی بنویس." }).min(-180).max(180),
    base_capacity: count(1, "ظرفیت پایه دست‌کم ۱ نفر است."),
    max_capacity: count(1, "ظرفیت حداکثر دست‌کم ۱ نفر است."),
    bedrooms: count(0, "تعداد اتاق را عددی بنویس."),
    beds: count(0, "تعداد تخت را عددی بنویس."),
    bathrooms: count(0, "تعداد سرویس را عددی بنویس."),
    area_m2: z.string().optional(),
    base_price_toman: z.coerce.number<string>().positive({ error: "قیمت هر شب باید بیشتر از صفر باشد." }),
    extra_guest_toman: z.coerce.number<string>().min(0, { error: "هزینهٔ نفر اضافه نمی‌تواند منفی باشد." }),
    min_nights: count(1, "حداقل اقامت دست‌کم ۱ شب است."),
    check_in_time: z.string().regex(/^\d{2}:\d{2}$/, { error: "ساعت ورود را انتخاب کن." }),
    check_out_time: z.string().regex(/^\d{2}:\d{2}$/, { error: "ساعت خروج را انتخاب کن." }),
    house_rules: z.string().optional(),
    status: z.enum(["draft", "active", "inactive"]),
    amenity_ids: z.array(z.number()),
    images: z.array(z.object({ url: z.string().trim().min(1, { error: "نشانی تصویر را بنویس یا این ردیف را حذف کن." }) })),
    cover: z.string(),
  })
  .refine((v) => v.max_capacity >= v.base_capacity, {
    path: ["max_capacity"],
    error: "ظرفیت حداکثر باید از ظرفیت پایه بیشتر یا برابر باشد.",
  })
  .refine((v) => !v.area_m2 || Number(v.area_m2) > 0, { path: ["area_m2"], error: "متراژ باید عددی مثبت باشد." });

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const DEFAULTS: FormIn = {
  host_id: "",
  type_id: "",
  city_id: "",
  title: "",
  slug: "",
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  base_capacity: "2",
  max_capacity: "4",
  bedrooms: "1",
  beds: "1",
  bathrooms: "1",
  area_m2: "",
  base_price_toman: "",
  extra_guest_toman: "0",
  min_nights: "1",
  check_in_time: "14:00",
  check_out_time: "12:00",
  house_rules: "",
  status: "draft",
  amenity_ids: [],
  images: [{ url: "" }],
  cover: "0",
};

const blank = (s?: string) => (s && s.trim() ? s.trim() : undefined);

export function StayCreateDialog() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const hosts = useHosts();
  const types = useTypes();
  const cities = useCities();
  const amenities = useAmenities();

  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, formState, reset } = form;
  const errors = formState.errors;
  const images = useFieldArray({ control, name: "images" });

  const create = useMutation({
    mutationFn: (v: FormOut) =>
      api<StayCard>("/admin/accommodations", {
        method: "POST",
        body: {
          host_id: v.host_id,
          type_id: v.type_id,
          city_id: v.city_id,
          title: v.title,
          slug: v.slug,
          description: blank(v.description),
          address: v.address,
          latitude: v.latitude,
          longitude: v.longitude,
          base_capacity: v.base_capacity,
          max_capacity: v.max_capacity,
          bedrooms: v.bedrooms,
          beds: v.beds,
          bathrooms: v.bathrooms,
          area_m2: v.area_m2 ? Number(v.area_m2) : undefined,
          base_price_per_night: tomanToRial(v.base_price_toman),
          extra_guest_price: tomanToRial(v.extra_guest_toman),
          min_nights: v.min_nights,
          check_in_time: v.check_in_time,
          check_out_time: v.check_out_time,
          house_rules: blank(v.house_rules),
          status: v.status,
          amenity_ids: v.amenity_ids,
          images: v.images.map((img, i) => ({ url: img.url, is_cover: String(i) === v.cover })),
        },
      }),
    onSuccess: (s) => {
      toast.success(`«${s.title}» ثبت شد.`);
      qc.invalidateQueries({ queryKey: adminKeys.stays });
      reset(DEFAULTS);
      setOpen(false);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const selectField = (
    name: "host_id" | "type_id" | "city_id",
    label: string,
    placeholder: string,
    options: { id: number; name: string }[] | undefined,
  ) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`new-${name}`}>{label}</FieldLabel>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select dir="rtl" value={String(field.value ?? "")} onValueChange={field.onChange}>
            <SelectTrigger id={`new-${name}`} className="w-full" aria-invalid={!!errors[name]}>
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

  const textField = (
    name: keyof FormIn,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    hint?: string,
  ) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={`new-${name}`}>{label}</FieldLabel>
      <Input id={`new-${name}`} aria-invalid={!!errors[name]} {...props} {...register(name)} />
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <FieldError errors={[errors[name] as { message?: string } | undefined]} />
    </Field>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset(DEFAULTS);
      }}
    >
      <DialogTrigger asChild>
        <Button className="journal-sm journal-press h-10 rounded-full bg-lapis px-5 font-bold">
          <Plus /> اقامتگاه تازه
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-display text-3xl">ثبت اقامتگاه تازه</DialogTitle>
          <DialogDescription>
            قیمت‌ها را به تومان بنویس. اگر وضعیت را «پیش‌نویس» بگذاری، اقامتگاه هنوز در سایت دیده نمی‌شود.
          </DialogDescription>
        </DialogHeader>

        <form id="create-stay" onSubmit={handleSubmit((v) => create.mutate(v))} noValidate>
          <FieldGroup>
            <FieldSet>
              <FieldLegend>اطلاعات اصلی</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-3">
                {selectField("host_id", "میزبان", "میزبان را انتخاب کن", hosts.data?.map((h) => ({ id: h.id, name: h.full_name })))}
                {selectField("type_id", "نوع اقامتگاه", "نوع را انتخاب کن", types.data)}
                {selectField("city_id", "شهر", "شهر را انتخاب کن", cities.data)}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {textField("title", "عنوان", { placeholder: "ویلای ساحلی رامسر" })}
                {textField("slug", "نامک (slug)", { dir: "ltr", placeholder: "ramsar-beach-villa" }, "در نشانی صفحه می‌آید و باید یکتا باشد.")}
              </div>
              <Field>
                <FieldLabel htmlFor="new-description">توضیحات</FieldLabel>
                <Textarea id="new-description" rows={3} {...register("description")} />
              </Field>
              {textField("address", "نشانی")}
              <div className="grid gap-4 sm:grid-cols-2">
                {textField("latitude", "عرض جغرافیایی", { dir: "ltr", inputMode: "decimal", placeholder: "36.9031" }, "به درجهٔ اعشاری، مثل 36.9031")}
                {textField("longitude", "طول جغرافیایی", { dir: "ltr", inputMode: "decimal", placeholder: "50.6583" }, "به درجهٔ اعشاری، مثل 50.6583")}
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>ظرفیت و فضا</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-3">
                {textField("base_capacity", "ظرفیت پایه (نفر)", { type: "number", min: 1 })}
                {textField("max_capacity", "ظرفیت حداکثر (نفر)", { type: "number", min: 1 })}
                {textField("area_m2", "متراژ (مترمربع)", { type: "number", min: 1 }, "اختیاری")}
                {textField("bedrooms", "اتاق خواب", { type: "number", min: 0 })}
                {textField("beds", "تخت", { type: "number", min: 0 })}
                {textField("bathrooms", "سرویس بهداشتی", { type: "number", min: 0 })}
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>قیمت و قوانین</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-3">
                {textField("base_price_toman", "قیمت هر شب (تومان)", { type: "number", min: 1, placeholder: "4000000" })}
                {textField("extra_guest_toman", "هر نفر اضافه در شب (تومان)", { type: "number", min: 0 })}
                {textField("min_nights", "حداقل اقامت (شب)", { type: "number", min: 1 })}
                {textField("check_in_time", "ساعت ورود", { type: "time", dir: "ltr" })}
                {textField("check_out_time", "ساعت خروج", { type: "time", dir: "ltr" })}
                <Field>
                  <FieldLabel htmlFor="new-status">وضعیت</FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select dir="rtl" value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="new-status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["draft", "active", "inactive"] as const).map((s) => (
                            <SelectItem key={s} value={s}>
                              {stayStatusLabel[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="new-house_rules">قوانین خانه</FieldLabel>
                <Textarea id="new-house_rules" rows={2} placeholder="سیگار کشیدن داخل خانه ممنوع است." {...register("house_rules")} />
              </Field>
            </FieldSet>

            <FieldSet>
              <FieldLegend>امکانات</FieldLegend>
              <Controller
                control={control}
                name="amenity_ids"
                render={({ field }) => (
                  <AmenityChecks idPrefix="new" value={field.value} onChange={field.onChange} amenities={amenities.data} />
                )}
              />
            </FieldSet>

            <FieldSet>
              <FieldLegend>تصویرها</FieldLegend>
              <FieldDescription>نشانی هر تصویر را بنویس و یکی را عکس جلد کن.</FieldDescription>
              <Controller
                control={control}
                name="cover"
                render={({ field }) => (
                  <RadioGroup dir="rtl" value={field.value} onValueChange={field.onChange} className="gap-3">
                    {images.fields.map((f, i) => (
                      <div key={f.id} className="flex items-start gap-3">
                        <div className="flex h-8 items-center gap-1.5">
                          <RadioGroupItem value={String(i)} id={`new-cover-${i}`} />
                          <label htmlFor={`new-cover-${i}`} className="text-xs whitespace-nowrap">
                            جلد
                          </label>
                        </div>
                        <div className="flex-1">
                          <Input
                            dir="ltr"
                            placeholder="/stays/ramsar.jpg یا https://…"
                            aria-label={`نشانی تصویر ${i + 1}`}
                            aria-invalid={!!errors.images?.[i]?.url}
                            {...register(`images.${i}.url`)}
                          />
                          <FieldError errors={[errors.images?.[i]?.url]} />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`حذف تصویر ${i + 1}`}
                          onClick={() => {
                            images.remove(i);
                            if (field.value === String(i)) field.onChange("0");
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => images.append({ url: "" })}>
                <Plus /> افزودن تصویر
              </Button>
            </FieldSet>
          </FieldGroup>
        </form>

        <DialogFooter>
          <PendingButton form="create-stay" type="submit" pending={create.isPending} className="bg-lapis px-5">
            ثبت اقامتگاه
          </PendingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AmenityChecks({
  idPrefix,
  value,
  onChange,
  amenities,
}: {
  idPrefix: string;
  value: number[];
  onChange: (ids: number[]) => void;
  amenities: { id: number; name: string }[] | undefined;
}) {
  if (!amenities) return <p className="text-sm text-muted-foreground">در حال بارگذاری امکانات…</p>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {amenities.map((a) => {
        const id = `${idPrefix}-amenity-${a.id}`;
        const checked = value.includes(a.id);
        return (
          <Field key={a.id} orientation="horizontal">
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(c) => onChange(c ? [...value, a.id] : value.filter((x) => x !== a.id))}
            />
            <FieldLabel htmlFor={id} className="font-normal">
              {a.name}
            </FieldLabel>
          </Field>
        );
      })}
    </div>
  );
}
