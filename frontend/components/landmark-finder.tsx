"use client";

/*
  "Start from the place, not the bed": pick a landmark (a waterfall, a beach, a bazaar…) and see the stays
  closest to it, each with a distance ruler, on a map. Backed by GET /catalog/points-of-interest and
  GET /accommodations?near_poi_id=…&sort=distance.
  Layout: the landmark list and the result panel share one fixed height, so a category with many landmarks
  scrolls inside its column instead of leaving the result panel floating above empty space.
*/

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryStyle, distanceLabel, travelHint } from "@/components/discovery-radar";
import { StayMap } from "@/components/maps";
import { fa, tomanShort } from "@/lib/format";
import { useLandmarks, useSearch } from "@/lib/queries";
import type { Poi } from "@/lib/types";
import { cn } from "@/lib/utils";

const RADIUS = 40;
// nature first: that is what people travel for
const ORDER = ["طبیعت", "ساحل", "جاذبهٔ تاریخی", "بازار", "موزه", "رستوران"];

export function LandmarkFinder() {
  const landmarks = useLandmarks(RADIUS);
  const usable = useMemo(() => (landmarks.data ?? []).filter((l) => l.stays_nearby > 0), [landmarks.data]);
  const categories = useMemo(() => ORDER.filter((c) => usable.some((l) => l.category === c)), [usable]);
  const [category, setCategory] = useState<string>("طبیعت");
  const [picked, setPicked] = useState<number | null>(null);
  const inCategory = usable.filter((l) => l.category === category);
  const current = usable.find((l) => l.id === picked) ?? inCategory[0];
  const near = useSearch({ near_poi_id: current?.id, radius_km: RADIUS, sort: "distance", size: 3 }, Boolean(current));
  const stays = near.data?.items ?? [];
  const max = Math.max(1, ...stays.map((s) => s.distance_km ?? 0));

  // the map: the landmark in the middle, its stays as pins
  const center = current ? { lat: current.latitude, lng: current.longitude, label: current.name } : null;
  const pins: Poi[] = stays.map((s) => ({
    id: s.id,
    name: s.title,
    category: "اقامتگاه",
    distance_km: s.distance_km ?? 0,
    latitude: s.latitude,
    longitude: s.longitude,
  }));

  return (
    <section id="landmarks" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24" aria-labelledby="landmarks-title">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="text-sm font-bold text-anar">اول جا، بعد جای خواب</p>
          <h2 id="landmarks-title" className="text-display mt-2 text-5xl text-ink">
            از یک جاذبه شروع کن
          </h2>
          <p className="mt-4 max-w-xl leading-8 text-ink/80">
            آبشار، دره، ساحل یا بازار قدیمی؛ هر جا که دلت می‌خواهد ببینی را انتخاب کن تا نزدیک‌ترین اقامتگاه‌ها را به ترتیب
            فاصله نشانت بدهیم.
          </p>
        </div>
        {!landmarks.isLoading && (
          <ToggleGroup
            type="single"
            value={category}
            onValueChange={(v) => {
              if (!v) return;
              setCategory(v);
              setPicked(null);
            }}
            className="flex flex-wrap justify-start gap-2"
            aria-label="نوع جاذبه"
          >
            {categories.map((c) => {
              const st = categoryStyle(c);
              return (
                <ToggleGroupItem
                  key={c}
                  value={c}
                  className="h-9 gap-1.5 rounded-full border-[1.5px] border-ink/25 bg-card px-4 font-semibold data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-paper"
                >
                  <st.icon className="size-4" /> {c}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        )}
      </div>

      {landmarks.isLoading ? (
        <Skeleton className="mt-8 h-[520px]" />
      ) : (
        <div className="mt-8 grid gap-6 lg:h-[540px] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* the landmarks: a fixed-height column that scrolls, however many a category has */}
          <div className="flex min-h-0 flex-col rounded-2xl border-[1.5px] border-dashed border-ink/30 bg-card/60 p-3">
            <p className="px-1 pb-2 text-sm font-bold text-muted-foreground">
              {category}، {fa(inCategory.length)} جاذبه
            </p>
            <ul
              className="grid max-h-80 min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto overscroll-contain pe-1 [mask-image:linear-gradient(to_bottom,#000_88%,transparent)] sm:grid-cols-2 lg:max-h-none"
              aria-label={`جاذبه‌های ${category}`}
            >
              {inCategory.map((l) => {
                const on = current?.id === l.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPicked(l.id)}
                      className={cn(
                        "h-full w-full rounded-xl border-[1.5px] px-3.5 py-2.5 text-start transition",
                        on ? "border-ink bg-saffron/25 shadow-[var(--shadow-journal-sm)]" : "border-ink/15 bg-card hover:border-ink",
                      )}
                    >
                      <span className="block font-bold">{l.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {l.city}، {fa(l.stays_nearby)} اقامتگاه نزدیک
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* the answer: landmark, map, nearest stays */}
          <div className="journal flex min-h-0 flex-col overflow-hidden" aria-live="polite">
            {current && (
              <div className="flex items-center gap-3 border-b-2 border-dashed border-ink/25 p-4">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full text-white"
                  style={{ background: categoryStyle(current.category).color }}
                >
                  <MapPin className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">نزدیک‌ترین اقامتگاه‌ها به</p>
                  <p className="text-display truncate text-2xl">{current.name}</p>
                </div>
                <Button asChild variant="link" className="shrink-0 px-0 font-bold text-lapis">
                  <Link href={`/stays?near_poi_id=${current.id}&radius_km=${RADIUS}&sort=distance`}>
                    همه <ArrowLeft />
                  </Link>
                </Button>
              </div>
            )}

            <div className="relative h-56 shrink-0 border-b-2 border-ink lg:h-auto lg:min-h-0 lg:flex-1">
              {center && pins.length > 0 ? (
                <StayMap key={current?.id} center={center} pois={pins} />
              ) : (
                <Skeleton className="size-full rounded-none" />
              )}
            </div>

            <ol className="divide-y divide-dashed divide-ink/15 px-4">
              {near.isLoading || !current
                ? [0, 1].map((i) => <Skeleton key={i} className="my-3 h-16" />)
                : stays.map((s) => {
                    const hint = travelHint(s.distance_km ?? 0);
                    return (
                      <li key={s.id}>
                        <Link href={`/stays/${s.id}`} className="group flex items-center gap-4 py-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={s.cover_image ?? ""} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold group-hover:underline">{s.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.city}، شبی از {tomanShort(s.base_price_per_night)} تومان
                              {s.rating.count > 0 && (
                                <span className="ms-1.5 inline-flex items-center gap-0.5">
                                  <Star className="size-3 fill-saffron text-saffron" />
                                  {fa(s.rating.average ?? 0, { maximumFractionDigits: 1 })}
                                </span>
                              )}
                            </p>
                            {/* the distance as a dashed route, longer = farther */}
                            <div className="mt-1.5 flex items-center gap-2">
                              <span className="size-2 rounded-full bg-saffron ring-2 ring-ink" aria-hidden />
                              <span
                                className="h-0 border-t-[3px] border-dashed border-saffron"
                                style={{ width: `${Math.max(8, ((s.distance_km ?? 0) / max) * 55)}%` }}
                                aria-hidden
                              />
                              <span className="size-2 rounded-full bg-anar" aria-hidden />
                              <span className="text-xs font-bold whitespace-nowrap">{distanceLabel(s.distance_km ?? 0)}</span>
                              <span className="hidden items-center gap-1 text-xs whitespace-nowrap text-muted-foreground sm:flex">
                                <hint.icon className="size-3.5" /> {hint.text}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
