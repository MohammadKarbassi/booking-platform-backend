"use client";

/*
  "Start from the place, not the bed": pick a landmark (a waterfall, a beach, a bazaar…) and see the stays
  closest to it, each with a distance ruler. Backed by GET /catalog/points-of-interest and
  GET /accommodations?near_poi_id=…&sort=distance.
*/

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryStyle, distanceLabel, travelHint } from "@/components/discovery-radar";
import { fa, tomanShort } from "@/lib/format";
import { useLandmarks, useSearch } from "@/lib/queries";
import { cn } from "@/lib/utils";

const RADIUS = 40;
// nature first: that is what people travel for
const ORDER = ["طبیعت", "ساحل", "جاذبهٔ تاریخی", "بازار", "موزه", "رستوران"];

export function LandmarkFinder() {
  const landmarks = useLandmarks(RADIUS);
  const usable = useMemo(() => (landmarks.data ?? []).filter((l) => l.stays_nearby > 0), [landmarks.data]);
  const categories = useMemo(
    () => ORDER.filter((c) => usable.some((l) => l.category === c)),
    [usable],
  );
  const [category, setCategory] = useState<string>("طبیعت");
  const [picked, setPicked] = useState<number | null>(null);
  const inCategory = usable.filter((l) => l.category === category);
  const current = usable.find((l) => l.id === picked) ?? inCategory[0];
  const near = useSearch({ near_poi_id: current?.id, radius_km: RADIUS, sort: "distance", size: 4 }, Boolean(current));
  const max = Math.max(1, ...(near.data?.items ?? []).map((s) => s.distance_km ?? 0));

  return (
    <section id="landmarks" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-24" aria-labelledby="landmarks-title">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold text-anar">اول جا، بعد جای خواب</p>
          <h2 id="landmarks-title" className="text-display mt-2 text-5xl text-ink">
            از یک جاذبه شروع کن
          </h2>
          <p className="mt-4 max-w-lg leading-8 text-ink/80">
            آبشار، دره، ساحل یا بازار قدیمی؛ هر جا که دلت می‌خواهد ببینی را انتخاب کن تا نزدیک‌ترین اقامتگاه‌ها را به ترتیب
            فاصله نشانت بدهیم.
          </p>

          {landmarks.isLoading ? (
            <Skeleton className="mt-6 h-40" />
          ) : (
            <>
              <ToggleGroup
                type="single"
                value={category}
                onValueChange={(v) => {
                  if (!v) return;
                  setCategory(v);
                  setPicked(null);
                }}
                className="mt-6 flex flex-wrap justify-start gap-2"
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

              <ul className="mt-5 flex flex-wrap gap-2" aria-label="جاذبه‌ها">
                {inCategory.map((l) => {
                  const on = current?.id === l.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setPicked(l.id)}
                        className={cn(
                          "rounded-xl border-[1.5px] px-3.5 py-2 text-start transition",
                          on ? "journal-sm border-ink bg-saffron/25" : "border-dashed border-ink/30 bg-card hover:border-ink",
                        )}
                      >
                        <span className="block font-bold">{l.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {l.city}، {fa(l.stays_nearby)} اقامتگاه تا {fa(RADIUS)} کیلومتری
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="journal self-start p-5" aria-live="polite">
          {current && (
            <div className="flex items-center gap-3 border-b-2 border-dashed border-ink/25 pb-4">
              <span
                className="grid size-11 place-items-center rounded-full text-white"
                style={{ background: categoryStyle(current.category).color }}
              >
                <MapPin className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">نزدیک‌ترین‌ها به</p>
                <p className="text-display text-2xl">{current.name}</p>
              </div>
            </div>
          )}
          <ol className="mt-2 divide-y divide-dashed divide-ink/15">
            {near.isLoading || !current
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="my-3 h-20" />)
              : near.data?.items.map((s) => {
                  const hint = travelHint(s.distance_km ?? 0);
                  return (
                    <li key={s.id}>
                      <Link href={`/stays/${s.id}`} className="group flex items-center gap-4 rounded-lg py-3 hover:bg-ink/[0.03]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.cover_image ?? ""} alt="" className="size-20 shrink-0 rounded-lg object-cover" />
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
                          <div className="mt-2 flex items-center gap-2">
                            <span className="size-2 rounded-full bg-saffron ring-2 ring-ink" aria-hidden />
                            <span
                              className="h-0 border-t-[3px] border-dashed border-saffron"
                              style={{ width: `${Math.max(8, ((s.distance_km ?? 0) / max) * 60)}%` }}
                              aria-hidden
                            />
                            <span className="size-2 rounded-full bg-anar" aria-hidden />
                            <span className="text-xs font-bold whitespace-nowrap">
                              {distanceLabel(s.distance_km ?? 0)}
                            </span>
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
          {current && (
            <Button asChild variant="link" className="mt-2 px-0 font-bold text-lapis">
              <Link href={`/stays?near_poi_id=${current.id}&radius_km=${RADIUS}&sort=distance`}>
                همهٔ اقامتگاه‌های اطراف {current.name} <ArrowLeft />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
