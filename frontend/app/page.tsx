"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { StayPostcard, StayPostcardSkeleton } from "@/components/stay-postcard";
import { DiscoveryRadar, PoiList } from "@/components/discovery-radar";
import { StaysMap } from "@/components/maps";
import { PostcardDeck } from "@/components/postcard-deck";
import { JournalBar } from "@/components/journal-bar";
import { LandmarkFinder } from "@/components/landmark-finder";
import { WaitlistShowcase } from "@/components/waitlist-showcase";
import { fa } from "@/lib/format";
import { useCities, useNearby, useProvinces, useSearch } from "@/lib/queries";

/** The site's logotype over the deck: «دورت بگردم؛» / «ایران.», with the saffron route circling «دورت». */
function HeroTitle() {
  return (
    <h1 className="app-fg text-display text-center text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95]">
      <span className="block">
        <span className="relative inline-block px-[0.1em]">
          <svg
            aria-hidden
            viewBox="0 0 200 120"
            preserveAspectRatio="none"
            className="absolute -inset-x-[0.3em] -inset-y-[0.2em] h-[calc(100%+0.4em)] w-[calc(100%+0.6em)] overflow-visible"
          >
            <path
              d="M 172 22 C 205 48 196 100 112 110 C 30 118 -6 82 12 46 C 28 14 92 4 150 14 C 168 17 180 24 186 30"
              fill="none"
              stroke="var(--saffron)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="14 11"
              pathLength={1200}
              style={{ ["--route-len" as string]: 1200, strokeDashoffset: 0 }}
              className="motion-safe:animate-[route-draw_1.6s_2.2s_cubic-bezier(.6,0,.2,1)_both]"
            />
            <circle cx="186" cy="30" r="7" fill="var(--anar)" stroke="var(--ink)" strokeWidth="2.5" />
          </svg>
          <span className="relative">دورت</span>
        </span>{" "}
        بگردم؛
      </span>
      <span className="block font-sans text-[0.78em] font-light tracking-tight">ایران.</span>
    </h1>
  );
}

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
      <section className="relative h-[calc(100svh-4rem)] min-h-[600px] border-b-2 border-ink" aria-label="کارت‌پستال‌های دور ایران">
        {all.isError ? (
          <div className="grid h-full place-items-center px-4 text-center">
            <div>
              <HeroTitle />
              <p className="mt-6 text-muted-foreground">کارت‌پستال‌ها نیامدند: {(all.error as Error).message}</p>
              <Button className="mt-4 bg-lapis" onClick={() => all.refetch()}>دوباره امتحان کن</Button>
            </div>
          </div>
        ) : (
          <PostcardDeck stays={stays} title={<HeroTitle />} />
        )}
        <JournalBar />
        <a
          href="#discover"
          className="absolute bottom-7 left-6 z-[460] hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold app-fg opacity-70 hover:opacity-100 lg:flex"
        >
          <ArrowDown className="size-4 motion-safe:animate-bounce" /> قطب‌نما و نقشه
        </a>
      </section>

      {/* a plain search for whoever skips the deck */}
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Compass className="size-4 text-lapis" />
          {all.data
            ? `${fa(all.data.total)} اقامتگاه در ${fa(cities.data?.length ?? 0)} شهر و ${fa(provinces.data?.length ?? 0)} استان`
            : "در حال باز کردن نقشه…"}
        </p>
        <SearchBar />
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
