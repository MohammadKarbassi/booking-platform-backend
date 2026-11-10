"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fa, toman } from "@/lib/format";
import { useAdminStay } from "@/components/admin/queries";
import { ListError, StayStatusBadge } from "@/components/admin/shared";
import { StayEditForm } from "@/components/admin/stay-edit-form";
import { StayCalendar } from "@/components/admin/stay-calendar";
import { PricingRules } from "@/components/admin/pricing-rules";

export default function AdminStayPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const stay = useAdminStay(id);

  return (
    <div className="flex flex-col gap-8">
      <Button asChild variant="link" className="w-fit px-0 font-bold text-lapis">
        <Link href="/admin">
          <ArrowRight /> بازگشت به فهرست اقامتگاه‌ها
        </Link>
      </Button>

      {stay.isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : stay.isError || !stay.data ? (
        <ListError error={stay.error} onRetry={() => stay.refetch()} />
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-4">
            {stay.data.cover_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stay.data.cover_image} alt="" className="h-20 w-28 rounded-lg object-cover ring-2 ring-ink" />
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-display text-4xl text-ink">{stay.data.title}</h2>
                <StayStatusBadge status={stay.data.status} />
              </div>
              <p className="mt-1 text-sm text-ink/75">
                {stay.data.type} در {stay.data.city}، {stay.data.province}، میزبان: {stay.data.host.full_name}، ظرفیت{" "}
                {fa(stay.data.base_capacity)} تا {fa(stay.data.max_capacity)} نفر، پایهٔ هر شب {toman(stay.data.base_price_per_night)}
              </p>
            </div>
            {stay.data.status === "active" && (
              <Button asChild variant="outline" className="rounded-full border-ink font-bold">
                <Link href={`/stays/${stay.data.id}`} target="_blank">
                  <ExternalLink /> دیدن صفحه در سایت
                </Link>
              </Button>
            )}
          </header>

          <Card className="journal">
            <CardHeader>
              <CardTitle className="text-display text-2xl">مشخصات و وضعیت</CardTitle>
              <CardDescription>نوع، شهر، نشانی و ظرفیت بعد از ثبت عوض نمی‌شوند؛ بقیه را این‌جا ویرایش کن.</CardDescription>
            </CardHeader>
            <CardContent>
              <StayEditForm key={stay.data.id} stay={stay.data} />
            </CardContent>
          </Card>

          <Card className="journal">
            <CardHeader>
              <CardTitle className="text-display text-2xl">تقویم و قیمت روزانه</CardTitle>
              <CardDescription>
                برای روزهای خاص قیمت ویژه بگذار یا آن‌ها را ببند. قیمت ویژه از هر قانون قیمتی مهم‌تر است.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StayCalendar stay={stay.data} />
            </CardContent>
          </Card>

          <Card className="journal">
            <CardHeader>
              <CardTitle className="text-display text-2xl">قانون‌های قیمت</CardTitle>
              <CardDescription>آخر هفته، تعطیلات، فصل و تخفیف‌ها قیمت پایه را خودکار تغییر می‌دهند.</CardDescription>
            </CardHeader>
            <CardContent>
              <PricingRules stayId={stay.data.id} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
