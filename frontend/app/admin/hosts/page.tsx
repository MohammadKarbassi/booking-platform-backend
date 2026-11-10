"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api";
import { fa } from "@/lib/format";
import type { Host } from "@/lib/types";
import { adminKeys, useHosts } from "@/components/admin/queries";
import { ListEmpty, ListError, PendingButton, RowsSkeleton, SectionTitle } from "@/components/admin/shared";

const schema = z.object({
  full_name: z.string().trim().min(3, { error: "نام و نام خانوادگی میزبان را بنویس." }).max(150),
  phone: z.string().trim().regex(/^09\d{9}$/, { error: "شمارهٔ همراه ۱۱ رقمی با ۰۹ شروع می‌شود؛ مثل 09121234567." }),
});
type HostForm = z.infer<typeof schema>;

export default function AdminHostsPage() {
  const hosts = useHosts();
  const qc = useQueryClient();
  const { register, handleSubmit, formState, reset } = useForm<HostForm>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", phone: "" },
  });
  const errors = formState.errors;

  const add = useMutation({
    mutationFn: (v: HostForm) => api<Host>("/admin/hosts", { method: "POST", body: v }),
    onSuccess: (h) => {
      toast.success(`میزبان «${h.full_name}» ثبت شد.`);
      qc.invalidateQueries({ queryKey: adminKeys.hosts });
      reset();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <SectionTitle title="میزبان‌ها" description="هر اقامتگاه به یک میزبان وصل است. میزبان‌ها فعلاً وارد سامانه نمی‌شوند." />
        {hosts.isLoading ? (
          <RowsSkeleton rows={5} />
        ) : hosts.isError ? (
          <ListError error={hosts.error} onRetry={() => hosts.refetch()} />
        ) : !hosts.data?.length ? (
          <ListEmpty title="هنوز میزبانی ثبت نشده" description="از فرم کنار، اولین میزبان را اضافه کن." />
        ) : (
          <div className="journal-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">شناسه</TableHead>
                  <TableHead>نام</TableHead>
                  <TableHead>شمارهٔ همراه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hosts.data.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-muted-foreground">{fa(h.id)}</TableCell>
                    <TableCell className="font-semibold">{h.full_name}</TableCell>
                    <TableCell dir="ltr" className="text-end">
                      {h.phone}
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
          <CardTitle className="text-display text-2xl">میزبان تازه</CardTitle>
          <CardDescription>بعد از ثبت، در فرم ساخت اقامتگاه انتخاب‌شدنی است.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => add.mutate(v))} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.full_name}>
                <FieldLabel htmlFor="host-name">نام و نام خانوادگی</FieldLabel>
                <Input id="host-name" aria-invalid={!!errors.full_name} {...register("full_name")} />
                <FieldError errors={[errors.full_name]} />
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="host-phone">شمارهٔ همراه</FieldLabel>
                <Input
                  id="host-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="09121234567"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
                <FieldError errors={[errors.phone]} />
              </Field>
              <PendingButton type="submit" pending={add.isPending} className="h-10 rounded-full bg-lapis">
                ثبت میزبان
              </PendingButton>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
