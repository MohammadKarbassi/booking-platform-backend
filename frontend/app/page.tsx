"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { StayPostcard, StayPostcardSkeleton } from "@/components/stay-postcard";
import { DiscoveryRadar, PoiList } from "@/components/discovery-radar";
import { StaysMap } from "@/components/maps";
import { PostcardDeck } from "@/components/postcard-deck";
import { HeroLogotype } from "@/components/hero-logotype";
import { JournalBar } from "@/components/journal-bar";
import { LandmarkFinder } from "@/components/landmark-finder";
import { WaitlistShowcase } from "@/components/waitlist-showcase";
import { fa } from "@/lib/format";
import { useCities, useNearby, useProvinces, useSearch } from "@/lib/queries";

export default function Home() {
  const all = useSearch({ size: 24, sort: "newest" });
  const provinces = useProvinces();
  const cities = useCities();
  const stays = all.data?.items ?? [];
  const featured = stays.find((s) => s.slug === "masuleh-suite") ?? stays[0];
  const nearby = useNearby(featured?.id ?? 0, 40);
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      {/* hero: the postcard deck (see components/postcard-deck.tsx) */}
      <section className="relative h-[clamp(360px,55svh,490px)] border-b-2 border-ink md:h-[calc(92svh-4rem)] md:min-h-[580px]" aria-label="کارت‌پستال‌های دور ایران">
        {all.isError ? (
          <div className="grid h-full place-items-center px-4 text-center">
            <div>
              <HeroLogotype />
              <p className="mt-6 text-muted-foreground">کارت‌پستال‌ها نیامدند: {(all.error as Error).message}</p>
              <Button className="mt-4 bg-lapis" onClick={() => all.refetch()}>دوباره امتحان کن</Button>
            </div>
          </div>
        ) : (
          <PostcardDeck stays={stays} title={(play) => <HeroLogotype play={play} />} />
        )}
        <JournalBar />
      </section>

      {/* a plain search for whoever skips the deck */}
      <section className="mx-auto max-w-5xl px-4 pt-5 md:pt-14">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Compass className="size-4 text-lapis" />
          {all.data
            ? `${fa(all.data.total)} اقامتگاه در ${fa(cities.data?.length ?? 0)} شهر و ${fa(provinces.data?.length ?? 0)} استان`
            : "در حال باز کردن نقشه…"}
        </p>
        <SearchBar className="max-sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] max-sm:[&>button:first-child]:col-span-full max-sm:[&>button:last-child]:col-span-full" />
      </section>

      {/* distinctive feature 1: start from a landmark */}
      <LandmarkFinder />

      {/* the compass teaser: the backend's points-of-interest feature, live */}
      {featured && (
        <section id="discover" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-sm font-bold text-anar">قطب‌نمای کشف</p>
              <h2 className="text-display mt-2 text-5xl text-ink">اول ببین دور و برش چیست</h2>
              <p className="mt-4 max-w-lg leading-8 text-ink/80">
                هر اقامتگاه یک نقطهٔ شروع است. قطب‌نما جاذبه‌های اطراف را به همان جهتی که واقعاً هستند نشان می‌دهد:
                شمال بالاست، و هر حلقه یعنی دورتر. این یکی <strong>{featured.title}</strong> است.
              </p>
              <div className="journal mt-6 max-h-80 overflow-auto p-3">
                {nearby.data ? (
                  <PoiList pois={nearby.data} activeId={active} onActive={setActive} />
                ) : (
                  <div className="h-40 animate-pulse rounded-lg bg-muted" />
                )}
              </div>
              <Button asChild variant="link" className="mt-3 px-0 text-base font-bold text-lapis">
                <Link href={`/stays/${featured.id}`}>
                  برو به {featured.title} <ArrowLeft />
                </Link>
              </Button>
            </div>
            {nearby.data && (
              <DiscoveryRadar
                center={{ lat: featured.latitude, lng: featured.longitude, label: featured.title }}
                pois={nearby.data}
                activeId={active}
                onActive={setActive}
              />
            )}
          </div>
        </section>
      )}

      {/* distinctive feature 2: the booking waitlist */}
      <WaitlistShowcase />

      {/* postcards */}
      <section className="mx-auto max-w-7xl px-4 pt-24">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-anar">کارت‌پستال‌های تازه</p>
            <h2 className="text-display mt-2 text-5xl text-ink">از ساحل خزر تا کپرهای قشم</h2>
          </div>
          <Button asChild variant="outline" className="journal-sm journal-press rounded-full font-bold">
            <Link href="/stays">همه را ببین</Link>
          </Button>
        </div>
        <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {all.isLoading
            ? Array.from({ length: 6 }, (_, i) => <StayPostcardSkeleton key={i} />)
            : stays.slice(0, 9).map((s, i) => <StayPostcard key={s.id} stay={s} index={i} />)}
        </div>
      </section>

      {/* map */}
      <section className="mx-auto max-w-7xl px-4 pt-24">
        <p className="text-sm font-bold text-anar">نقشهٔ سفر</p>
        <h2 className="text-display mt-2 mb-6 text-5xl text-ink">همهٔ نقطه‌ها روی نقشهٔ ایران</h2>
        <div className="journal h-[460px] overflow-hidden">{stays.length > 0 && <StaysMap stays={stays} />}</div>
      </section>
    </>
  );
}
