"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { RequireAuth } from "@/components/require-auth";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

const schema = z.object({
  first_name: z.string().trim().min(2, "نام دست‌کم ۲ حرف باشد").max(100),
  last_name: z.string().trim().min(2, "نام خانوادگی دست‌کم ۲ حرف باشد").max(100),
  email: z.union([z.literal(""), z.email("ایمیل درست نیست")]),
});
type Form = z.infer<typeof schema>;

function Profile() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", email: user?.email ?? "" },
  });
  const save = useMutation({
    mutationFn: (v: Form) => api<User>("/auth/me", { method: "PATCH", body: { ...v, email: v.email || null } }),
    onSuccess: (u) => {
      setUser(u);
      toast.success("پروفایل ذخیره شد");
      if (next) router.push(next);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <p className="text-sm font-bold text-anar">پروفایل</p>
      <h1 className="text-display mt-1 text-5xl text-ink">صاحب این گذرنامه</h1>
      <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="journal mt-8 p-6" noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel>شمارهٔ موبایل</FieldLabel>
            <Input value={user?.phone ?? ""} disabled dir="ltr" className="text-center" />
            <FieldDescription>ورودت با همین شماره است و عوض نمی‌شود.</FieldDescription>
          </Field>
          {(["first_name", "last_name", "email"] as const).map((name) => (
            <Controller
              key={name}
              control={form.control}
              name={name}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={name}>{{ first_name: "نام", last_name: "نام خانوادگی", email: "ایمیل (اختیاری)" }[name]}</FieldLabel>
                  <Input
                    {...field}
                    id={name}
                    aria-invalid={fieldState.invalid}
                    dir={name === "email" ? "ltr" : undefined}
                    autoComplete={{ first_name: "given-name", last_name: "family-name", email: "email" }[name]}
                  />
                  {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                </Field>
              )}
            />
          ))}
          <Button type="submit" size="lg" className="bg-lapis font-bold" disabled={save.isPending}>
            {save.isPending && <Spinner />} ذخیرهٔ پروفایل
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <RequireAuth what="پروفایلت">
        <Profile />
      </RequireAuth>
    </Suspense>
  );
}
