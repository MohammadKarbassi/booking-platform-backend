"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useFavorites } from "@/components/favorite-button";
import { RequireAuth } from "@/components/require-auth";
import { StayPostcard, StayPostcardSkeleton } from "@/components/stay-postcard";
import { errorMessage } from "@/lib/api";
import { fa } from "@/lib/format";

function Favorites() {
  const q = useFavorites();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-sm font-bold text-anar">نشان‌شده‌ها</p>
      <h1 className="text-display mt-1 text-5xl text-ink">
        جاهایی که دلت می‌خواهد {q.data?.length ? `(${fa(q.data.length)})` : ""}
      </h1>
      <div className="mt-10">
        {q.isError ? (
          <p className="text-anar">{errorMessage(q.error)}</p>
        ) : q.isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <StayPostcardSkeleton key={i} />)}</div>
        ) : !q.data?.length ? (
          <Empty className="journal">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Heart /></EmptyMedia>
              <EmptyTitle className="text-display text-3xl">هنوز چیزی نشان نکرده‌ای</EmptyTitle>
              <EmptyDescription>روی قلب هر کارت‌پستال بزن تا این‌جا جمع شود.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild className="bg-lapis font-bold"><Link href="/stays">کشف اقامتگاه‌ها</Link></Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {q.data.map((s, i) => <StayPostcard key={s.id} stay={s} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense>
      <RequireAuth what="نشان‌شده‌هایت">
        <Favorites />
      </RequireAuth>
    </Suspense>
  );
}
