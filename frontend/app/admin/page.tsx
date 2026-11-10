"use client";

import Link from "next/link";
import { ImageOff, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fa, toman } from "@/lib/format";
import type { AccommodationStatus } from "@/lib/types";
import { useAdminStays } from "@/components/admin/queries";
import { ListEmpty, ListError, RowsSkeleton, SectionTitle, StayStatusBadge, stayStatusLabel } from "@/components/admin/shared";
import { StayCreateDialog } from "@/components/admin/stay-create-dialog";
import { cn } from "@/lib/utils";

const STATUSES: AccommodationStatus[] = ["active", "draft", "inactive"];
const statColor: Record<AccommodationStatus, string> = {
  active: "text-firoozeh",
  draft: "text-saffron",
  inactive: "text-ink/60",
};

export default function AdminStaysPage() {
  const stays = useAdminStays();
  const list = stays.data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="آمار اقامتگاه‌ها" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="journal-sm p-4">
          <p className="text-sm font-semibold text-ink/70">همهٔ اقامتگاه‌ها</p>
          {stays.isLoading ? <Skeleton className="mt-2 h-9 w-12" /> : <p className="text-display mt-1 text-4xl">{fa(list.length)}</p>}
        </div>
        {STATUSES.map((s) => (
          <div key={s} className="journal-sm p-4">
            <p className="text-sm font-semibold text-ink/70">{stayStatusLabel[s]}</p>
            {stays.isLoading ? (
              <Skeleton className="mt-2 h-9 w-12" />
            ) : (
              <p className={cn("text-display mt-1 text-4xl", statColor[s])}>{fa(list.filter((x) => x.status === s).length)}</p>
            )}
          </div>
        ))}
      </section>

      <section>
        <SectionTitle
          title="اقامتگاه‌ها"
          description="همهٔ اقامتگاه‌ها با هر وضعیتی. برای ویرایش، قیمت روزانه و قانون‌های قیمت، «مدیریت» را بزن."
          action={<StayCreateDialog />}
        />
        {stays.isLoading ? (
          <RowsSkeleton rows={6} />
        ) : stays.isError ? (
          <ListError error={stays.error} onRetry={() => stays.refetch()} />
        ) : list.length === 0 ? (
          <ListEmpty title="هنوز اقامتگاهی ثبت نشده" description="با دکمهٔ «اقامتگاه تازه» اولین را اضافه کن." />
        ) : (
          <div className="journal-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">تصویر</TableHead>
                  <TableHead>عنوان</TableHead>
                  <TableHead>شهر</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>قیمت پایهٔ هر شب</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.cover_image} alt="" className="h-11 w-16 rounded-md object-cover ring-1 ring-ink/15" />
                      ) : (
                        <div className="flex h-11 w-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <ImageOff className="size-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold">{s.title}</TableCell>
                    <TableCell>
                      {s.city}
                      <span className="text-xs text-muted-foreground">، {s.province}</span>
                    </TableCell>
                    <TableCell>{s.type}</TableCell>
                    <TableCell>{toman(s.base_price_per_night)}</TableCell>
                    <TableCell>
                      <StayStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm" className="rounded-full border-ink font-bold">
                        <Link href={`/admin/stays/${s.id}`}>
                          <Settings2 /> مدیریت
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
