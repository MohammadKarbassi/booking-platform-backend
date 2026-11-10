"use client";

import Link from "next/link";
import { AudioLines, Star } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { Postmark } from "@/components/postmark";
import { fa, tomanShort } from "@/lib/format";
import { scapeForCity, scapeLabel, useSound } from "@/lib/sound";
import type { StayCard } from "@/lib/types";
import { cn } from "@/lib/utils";

const TILTS = ["-rotate-[1.6deg]", "rotate-[1.2deg]", "-rotate-[0.6deg]", "rotate-[1.8deg]", "-rotate-[1.1deg]"];

export function StayPostcard({ stay, index = 0, query = "" }: { stay: StayCard; index?: number; query?: string }) {
  const sound = useSound();
  const scape = scapeForCity(stay.city);
  const listening = sound.playing === scape;

  return (
    <article
      className={cn(
        "group relative transition-transform duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:rotate-0 focus-within:rotate-0",
        TILTS[index % TILTS.length],
      )}
      onMouseEnter={() => sound.play(scape)}
      onMouseLeave={sound.stop}
      onFocus={() => sound.play(scape)}
      onBlur={sound.stop}
    >
      <div className="rounded-[6px] bg-white p-2.5 pb-3 shadow-[0_1px_0_rgb(23_32_61/0.08),0_14px_30px_-14px_rgb(23_32_61/0.45)] ring-1 ring-ink/10 transition-shadow group-hover:shadow-[0_1px_0_rgb(23_32_61/0.08),0_26px_40px_-16px_rgb(23_32_61/0.55)]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-muted">
          {stay.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element -- any URL an admin pastes, no fixed host list
            <img
              src={stay.cover_image}
              alt={`نمای ${stay.title}`}
              loading="lazy"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">بدون عکس</div>
          )}

          {/* stamp + postmark in the top corner, like a real card */}
          <div className="absolute top-2.5 left-2.5 rotate-3">
            <div className="stamp w-16 shadow-sm">
              <div className="grid aspect-[4/5] place-items-center bg-lapis px-1 text-center text-white">
                <span className="text-display text-lg leading-tight">{stay.city}</span>
                <span className="text-[9px] font-bold opacity-80">{stay.province}</span>
              </div>
            </div>
          </div>
          <Postmark city={stay.city} className="absolute top-6 left-10 w-28 opacity-90 mix-blend-multiply" color="#fff" />

          <FavoriteButton stayId={stay.id} className="absolute top-2.5 right-2.5" />

          <div
            className={cn(
              "absolute right-2.5 bottom-2.5 flex items-center gap-1.5 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity",
              sound.enabled && "group-hover:opacity-100",
              listening && "opacity-100",
            )}
            aria-hidden
          >
            <AudioLines className={cn("size-3.5", listening && "animate-pulse")} />
            {scapeLabel[scape]}
          </div>
        </div>

        <div className="px-1 pt-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-display text-[1.35rem] text-ink">
              <Link href={`/stays/${stay.id}${query}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {stay.title}
              </Link>
            </h3>
            {stay.rating.count > 0 && (
              <span className="mt-1 flex shrink-0 items-center gap-1 text-sm font-bold">
                <Star className="size-3.5 fill-saffron text-saffron" />
                {fa(stay.rating.average ?? 0, { maximumFractionDigits: 1 })}
                <span className="font-normal text-muted-foreground">({fa(stay.rating.count)})</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {stay.type}، {fa(stay.bedrooms)} خواب، تا {fa(stay.max_capacity)} نفر
          </p>
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">شبی از </span>
            <span className="font-extrabold text-ink">{tomanShort(stay.base_price_per_night)}</span>
            <span className="text-muted-foreground"> تومان</span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function StayPostcardSkeleton() {
  return (
    <div className="rounded-[6px] bg-white p-2.5 pb-3 ring-1 ring-ink/10">
      <div className="aspect-[4/3] animate-pulse rounded-[3px] bg-muted" />
      <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
