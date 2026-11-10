"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { useAmenities } from "@/lib/queries";
import type { StayCard, StayDetail } from "@/lib/types";
import { adminKeys } from "@/components/admin/queries";
import { PendingButton, stayStatusLabel, tomanToRial } from "@/components/admin/shared";
import { AmenityChecks } from "@/components/admin/stay-create-dialog";

const schema = z.object({
  title: z.string().trim().min(3, { error: "عنوان را بنویس (دست‌کم ۳ حرف)." }).max(200),
  description: z.string(),
  base_price_toman: z.coerce.number<string>().positive({ error: "قیمت هر شب باید بیشتر از صفر باشد." }),
  extra_guest_toman: z.coerce.number<string>().min(0, { error: "هزینهٔ نفر اضافه نمی‌تواند منفی باشد." }),
  min_nights: z.coerce.number<string>().int().min(1, { error: "حداقل اقامت دست‌کم ۱ شب است." }),
  house_rules: z.string(),
  status: z.enum(["draft", "active", "inactive"]),
  amenity_ids: z.array(z.number()),
  images: z.array(z.object({ url: z.string(), is_cover: z.boolean() })),
});

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const toForm = (s: StayDetail): FormIn => ({
  title: s.title,
  description: s.description ?? "",
  base_price_toman: String(s.base_price_per_night / 10),
  extra_guest_toman: String(s.extra_guest_price / 10),
  min_nights: String(s.min_nights),
  house_rules: s.house_rules ?? "",
  status: s.status,
  amenity_ids: s.amenities.map((a) => a.id),
  images: s.images.map((i) => ({ url: i.url, is_cover: i.is_cover })),
});

export function StayEditForm({ stay }: { stay: StayDetail }) {
  const qc = useQueryClient();
  const amenities = useAmenities();
  const { register, control, handleSubmit, formState, reset } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: toForm(stay),
  });
  const errors = formState.errors;

  const save = useMutation({
    mutationFn: (v: FormOut) => {
      const images = v.images.filter((i) => i.url.trim()).map((i) => ({ url: i.url.trim(), is_cover: i.is_cover }));
      if (images.length && !images.some((i) => i.is_cover)) images[0].is_cover = true;
      return api<StayCard>(`/admin/accommodations/${stay.id}`, {
        method: "PATCH",
        body: {
          title: v.title,
          description: v.description.trim() || null,
          base_price_per_night: tomanToRial(v.base_price_toman),
          extra_guest_price: tomanToRial(v.extra_guest_toman),
          min_nights: v.min_nights,
          house_rules: v.house_rules.trim() || null,
          status: v.status,
          amenity_ids: v.amenity_ids,
          images,
        },
      });
    },
    onSuccess: async (s) => {
      toast.success(`تغییرات «${s.title}» ذخیره شد.`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: adminKeys.stay(stay.id) }),
        qc.invalidateQueries({ queryKey: adminKeys.stays }),
        qc.invalidateQueries({ queryKey: adminKeys.calendar(stay.id) }),
        qc.invalidateQueries({ queryKey: ["stay", stay.id] }),
      ]);
      const fresh = qc.getQueryData<StayDetail>(adminKeys.stay(stay.id));
      if (fresh) reset(toForm(fresh));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="edit-title">عنوان</FieldLabel>
            <Input id="edit-title" aria-invalid={!!errors.title} {...register("title")} />
            <FieldError errors={[errors.title]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-status">وضعیت</FieldLabel>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select dir="rtl" value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-status" className="w-full">
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
            <FieldDescription>فقط اقامتگاه «فعال» در سایت دیده و رزرو می‌شود.</FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="edit-description">توضیحات</FieldLabel>
          <Textarea id="edit-description" rows={4} {...register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={!!errors.base_price_toman}>
            <FieldLabel htmlFor="edit-price">قیمت پایهٔ هر شب (تومان)</FieldLabel>
            <Input id="edit-price" type="number" min={1} aria-invalid={!!errors.base_price_toman} {...register("base_price_toman")} />
            <FieldError errors={[errors.base_price_toman]} />
          </Field>
          <Field data-invalid={!!errors.extra_guest_toman}>
            <FieldLabel htmlFor="edit-extra">هر نفر اضافه در شب (تومان)</FieldLabel>
            <Input id="edit-extra" type="number" min={0} aria-invalid={!!errors.extra_guest_toman} {...register("extra_guest_toman")} />
            <FieldError errors={[errors.extra_guest_toman]} />
          </Field>
          <Field data-invalid={!!errors.min_nights}>
            <FieldLabel htmlFor="edit-min">حداقل اقامت (شب)</FieldLabel>
            <Input id="edit-min" type="number" min={1} aria-invalid={!!errors.min_nights} {...register("min_nights")} />
            <FieldError errors={[errors.min_nights]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="edit-rules">قوانین خانه</FieldLabel>
          <Textarea id="edit-rules" rows={2} {...register("house_rules")} />
        </Field>

        <FieldSet>
          <FieldLegend>امکانات</FieldLegend>
          <Controller
            control={control}
            name="amenity_ids"
            render={({ field }) => (
              <AmenityChecks idPrefix="edit" value={field.value} onChange={field.onChange} amenities={amenities.data} />
            )}
          />
        </FieldSet>

        <FieldSet>
          <FieldLegend>تصویرها</FieldLegend>
          <FieldDescription>ردیف‌های خالی ذخیره نمی‌شوند. اگر جلدی انتخاب نکنی، اولین تصویر جلد می‌شود.</FieldDescription>
          <Controller control={control} name="images" render={({ field }) => <ImagesEditor value={field.value} onChange={field.onChange} />} />
        </FieldSet>

        <div>
          <PendingButton type="submit" pending={save.isPending} className="journal-sm journal-press h-10 rounded-full bg-lapis px-6">
            ذخیرهٔ تغییرات
          </PendingButton>
        </div>
      </FieldGroup>
    </form>
  );
}

type Img = { url: string; is_cover: boolean };

function ImagesEditor({ value, onChange }: { value: Img[]; onChange: (v: Img[]) => void }) {
  const cover = String(value.findIndex((i) => i.is_cover));
  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        dir="rtl"
        value={cover}
        onValueChange={(c) => onChange(value.map((img, i) => ({ ...img, is_cover: String(i) === c })))}
        className="gap-3"
      >
        {value.map((img, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value={String(i)} id={`edit-cover-${i}`} />
              <label htmlFor={`edit-cover-${i}`} className="text-xs whitespace-nowrap">
                جلد
              </label>
            </div>
            {img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt="" className="h-9 w-12 shrink-0 rounded object-cover ring-1 ring-ink/15" />
            ) : (
              <div className="h-9 w-12 shrink-0 rounded bg-muted" />
            )}
            <Input
              dir="ltr"
              value={img.url}
              placeholder="/stays/ramsar.jpg یا https://…"
              aria-label={`نشانی تصویر ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`حذف تصویر ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </RadioGroup>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...value, { url: "", is_cover: value.length === 0 }])}
      >
        <Plus /> افزودن تصویر
      </Button>
    </div>
  );
}
