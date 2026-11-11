"use client";

/*
  The site's logotype: «ایران؛» over «دورت بگردم».
  "دورت بگردم" means "let me circle around you", so a red map pin sits on «ایران» and, from its tip,
  a hand-drawn saffron loop is drawn once around the word (down the right side, along the bottom,
  up the left, across the top, back to the pin), after the supplied GIF.
  Type: Vazirmatn Black for «ایران؛», Vazirmatn Medium for «دورت بگردم» (the self-hosted font in app/fonts).

  Entrance (starts when `play` turns true, i.e. after the deck's loader):
  «ایران؛» pops in → the pin drops onto it → the loop is drawn from the pin's tip (0.8 s) →
  «دورت», «بگردم» rise in below. With prefers-reduced-motion everything simply appears, loop already drawn.
*/

import { cn } from "@/lib/utils";

/** Hand-drawn loop in a 200×120 box: starts at the pin (top right) and goes round clockwise on screen. */
const LOOP = "M 176 20 C 206 46 198 102 110 110 C 30 117 -4 84 10 50 C 24 16 88 4 148 10 C 166 12 178 18 184 26";

function Loop({ play }: { play: boolean }) {
  return (
    <svg
      viewBox="0 0 200 120"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute -inset-x-[0.38em] -top-[0.12em] -bottom-[0.02em] z-20 h-[calc(100%+0.14em)] w-[calc(100%+0.76em)] overflow-visible"
    >
      <path
        d={LOOP}
        fill="none"
        stroke="var(--saffron)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1000}
        style={{ ["--route-len" as string]: 1000, strokeDasharray: 1000 }}
        className={cn(
          "[stroke-dashoffset:1000] [stroke-width:clamp(4px,0.09em,7px)]",
          play && "motion-safe:animate-[route-draw_.8s_.95s_cubic-bezier(.55,.05,.35,1)_forwards] motion-reduce:[stroke-dashoffset:0]",
        )}
      />
    </svg>
  );
}

function MapPin({ play }: { play: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none absolute -top-[0.44em] -right-[0.42em] z-30 block w-[0.34em]">
      <span
        className={cn(
          "block origin-bottom opacity-0",
          play && "motion-safe:animate-[pin-drop_.8s_.3s_cubic-bezier(.3,1.4,.5,1)_forwards] motion-reduce:opacity-100",
        )}
      >
        <svg viewBox="0 0 40 52" className="block w-full overflow-visible drop-shadow-[0_3px_3px_rgb(23_32_61/0.25)]">
          <path
            d="M20 2.5C10.6 2.5 3 10.1 3 19.4c0 12.6 17 30.1 17 30.1s17-17.5 17-30.1C37 10.1 29.4 2.5 20 2.5z"
            fill="#e8483f"
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="19" r="6.2" fill="#fff" />
        </svg>
      </span>
    </span>
  );
}

export function HeroLogotype({ play = true, className }: { play?: boolean; className?: string }) {
  // class names spelled out in full so Tailwind can see them
  const rise1 = cn("inline-block opacity-0", play && "motion-safe:animate-[word-drop_.6s_.45s_cubic-bezier(.2,.9,.3,1.2)_forwards] motion-reduce:opacity-100");
  const rise2 = cn("inline-block opacity-0", play && "motion-safe:animate-[word-drop_.6s_.57s_cubic-bezier(.2,.9,.3,1.2)_forwards] motion-reduce:opacity-100");

  return (
    <h1
      className={cn("app-fg flex flex-col items-center text-center font-sans leading-[1.05]", className)}
      aria-label="ایران؛ دورت بگردم"
    >
      {/* line 1: «ایران؛» with the pin on it and the loop drawn round it */}
      <span aria-hidden className="relative inline-block px-[0.12em] text-[clamp(3.2rem,7vw,6.2rem)] font-black tracking-tight">
        <span
          className={cn(
            "relative z-10 inline-block opacity-0",
            play && "motion-safe:animate-[word-pop_.6s_0s_cubic-bezier(.2,.9,.3,1.3)_forwards] motion-reduce:opacity-100",
          )}
        >
          ایران؛
        </span>
        <Loop play={play} />
        <MapPin play={play} />
      </span>
      {/* line 2: «دورت بگردم» */}
      <span className="mt-[0.3em] flex gap-[0.26em] text-[clamp(1.7rem,3.4vw,3rem)] font-medium" aria-hidden>
        <span className={rise1}>دورت</span>
        <span className={rise2}>بگردم</span>
      </span>
    </h1>
  );
}
