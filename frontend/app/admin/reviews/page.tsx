"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { fa, jDateTime } from "@/lib/format";
import type { AdminReview, ReviewStatus } from "@/lib/types";
import { adminKeys, useAdminReviews } from "@/components/admin/queries";
import { ListEmpty, ListError, PendingButton, RowsSkeleton, SectionTitle } from "@/components/admin/shared";
import { cn } from "@/lib/utils";

const TABS: { value: ReviewStatus; label: string; empty: string }[] = [
  { value: "pending", label: "در انتظار بررسی", empty: "نظری در انتظار بررسی نیست" },
  { value: "approved", label: "منتشرشده", empty: "هنوز نظری منتشر نشده" },
  { value: "rejected", label: "ردشده", empty: "نظر ردشده‌ای نداریم" },
];

export default function AdminReviewsPage() {
  const [tab, setTab] = useState<ReviewStatus>("pending");

  return (
    <section>
      <SectionTitle title="نظرها" description="نظر مسافر تا تأیید نشود در صفحهٔ اقامتگاه دیده نمی‌شود." />
      <Tabs dir="rtl" value={tab} onValueChange={(v) => setTab(v as ReviewStatus)}>
        <TabsList className="mb-4 h-10! border-[1.5px] border-ink bg-card">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-4 font-semibold data-active:bg-ink data-active:text-paper">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <ReviewList status={t.value} empty={t.empty} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function ReviewList({ status, empty }: { status: ReviewStatus; empty: string }) {
  const reviews = useAdminReviews(status);
  if (reviews.isLoading) return <RowsSkeleton rows={3} className="[&>*]:h-36" />;
  if (reviews.isError) return <ListError error={reviews.error} onRetry={() => reviews.refetch()} />;
  if (!reviews.data?.length) return <ListEmpty title={empty} />;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {reviews.data.map((r) => (
        <ReviewCard key={r.id} review={r} />
      ))}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${fa(rating)} از ۵ ستاره`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn("size-4", i < rating ? "fill-saffron text-saffron" : "text-ink/25")} />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: AdminReview }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState(review.admin_reply ?? "");
  const moderate = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      api(`/admin/reviews/${review.id}`, {
        method: "PATCH",
        body: { status, admin_reply: reply.trim() || undefined },
      }),
    onSuccess: (_, status) => {
      toast.success(status === "approved" ? "نظر تأیید و منتشر شد." : "نظر رد شد و منتشر نمی‌شود.");
      qc.invalidateQueries({ queryKey: adminKeys.reviews });
      qc.invalidateQueries({ queryKey: ["reviews", review.accommodation_id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card className="journal-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-bold">{review.accommodation_title}</CardTitle>
          <Stars rating={review.rating} />
        </div>
        <CardDescription>
          {review.guest || "مسافر بی‌نام"}، {jDateTime(review.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="leading-8">{review.comment || <span className="text-muted-foreground">بدون متن؛ فقط امتیاز داده.</span>}</p>
        {review.status === "pending" ? (
          <Field>
            <FieldLabel htmlFor={`reply-${review.id}`}>پاسخ مدیر (اختیاری)</FieldLabel>
            <Textarea
              id={`reply-${review.id}`}
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="ممنون که نوشتی…"
            />
          </Field>
        ) : (
          review.admin_reply && (
            <div className="rounded-lg border-s-4 border-lapis bg-muted/60 p-3 text-sm">
              <div className="mb-1 font-bold text-lapis">پاسخ مدیر</div>
              {review.admin_reply}
            </div>
          )
        )}
      </CardContent>
      {review.status === "pending" && (
        <CardFooter className="gap-2">
          <PendingButton
            pending={moderate.isPending && moderate.variables === "approved"}
            disabled={moderate.isPending}
            onClick={() => moderate.mutate("approved")}
            className="rounded-full bg-firoozeh px-4 hover:bg-firoozeh/85"
          >
            تأیید و انتشار
          </PendingButton>
          <PendingButton
            variant="destructive"
            pending={moderate.isPending && moderate.variables === "rejected"}
            disabled={moderate.isPending}
            onClick={() => moderate.mutate("rejected")}
            className="rounded-full px-4"
          >
            رد کردن
          </PendingButton>
        </CardFooter>
      )}
    </Card>
  );
}
