"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar";
import { StayPostcard, StayPostcardSkeleton } from "@/components/stay-postcard";
import { DiscoveryRadar, PoiList } from "@/components/discovery-radar";
import { StaysMap } from "@/components/maps";
import { Postmark } from "@/components/postmark";
import { fa, jShort, today } from "@/lib/format";
import { useCities, useNearby, useProvinces, useSearch } from "@/lib/queries";
import type { StayCard } from "@/lib/types";

function HeroTitle() {
  return (
    <h1 className="text-display text-[clamp(3.6rem,10vw,7.5rem)] text-ink">
      <span className="relative inline-block px-[0.12em]">
        <svg
          aria-hidden
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="absolute -inset-x-[0.28em] -inset-y-[0.18em] h-[calc(100%+0.36em)] w-[calc(100%+0.56em)] overflow-visible"
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
            className="motion-safe:animate-[route-draw_1.6s_cubic-bezier(.6,0,.2,1)_both]"
          />
          <circle cx="186" cy="30" r="7" fill="var(--anar)" stroke="var(--ink)" strokeWidth="2.5" />
        </svg>
        <span className="relative">دور</span>
      </span>{" "}
      ایران
      <br />
      بگردیم
    </h1>
  );
}

function PostcardStack({ stays }: { stays: StayCard[] }) {
  const cards = stays.slice(0, 3);
  const pose = [
    "rotate-[-9deg] translate-x-[18%] translate-y-[6%] group-hover:rotate-[-14deg] group-hover:translate-x-[34%]",
    "rotate-[6deg] -translate-x-[16%] translate-y-[2%] group-hover:rotate-[11deg] group-hover:-translate-x-[32%]",
    "rotate-[-2deg] group-hover:-translate-y-[4%]",
  ];
  return (
    <div className="group relative mx-auto aspect-[4/3.6] w-full max-w-[460px]" aria-hidden>
      {cards.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-x-[8%] top-[6%] rounded-[6px] bg-white p-3 pb-10 shadow-[0_24px_40px_-18px_rgb(23_32_61/0.55)] ring-1 ring-ink/10 transition-transform duration-500 ease-out ${pose[i]}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.cover_image ?? ""} alt="" className="aspect-[4/3] w-full rounded-[3px] object-cover" />
          <div className="absolute bottom-2.5 right-4 text-display text-xl text-ink">{s.city}</div>
          {i === 2 && <Postmark city={s.city} date={jShort(today())} className="absolute bottom-1 left-2 w-32" />}
        </div>
      ))}
    </div>
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
      {/* hero */}
      <section className="relative overflow-hidden border-b-2 border-ink">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-12 pb-16 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-sm font-semibold">
              <Compass className="size-4 text-lapis" />
              {all.data ? (
                <>
                  {fa(all.data.total)} اقامتگاه در {fa(cities.data?.length ?? 0)} شهر و {fa(provinces.data?.length ?? 0)} استان
                </>
              ) : (
                "در حال باز کردن نقشه…"
              )}
            </p>
            <HeroTitle />
            <p className="mt-6 max-w-xl text-lg leading-9 text-ink/80">
              جایی بخواب که صبحش یک کشف تازه باشد. برای هر اقامتگاه نشانت می‌دهیم دور و برش چه خبر است: از آبشار پشت
              روستا تا بازار سه کوچه آن‌طرف‌تر.
            </p>
            <span className="mt-4 inline-block -rotate-2 rounded-md bg-anar px-3 py-1 text-sm font-bold text-white shadow-[var(--shadow-journal-sm)]">
              دورت بگردم، ایران!
            </span>
          </div>
          {stays.length >= 3 ? <PostcardStack stays={stays.slice(2, 5).concat(stays).slice(0, 3)} /> : <div className="aspect-[4/3.6]" />}
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-14">
          <SearchBar />
        </div>
      </section>

      {/* the compass teaser: the backend's points-of-interest feature, live */}
      {featured && (
        <section className="mx-auto max-w-7xl px-4 pt-20">
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
