"use client";

/*
  The site's logotype: «دورت بگردم؛ ایران».
  "دورت بگردم" literally means "let me circle around you", so the mark shows exactly that:
  a tilted ring orbits the word «ایران» like a planet's ring, and a small red traveller goes round it forever.
  The ring's far half runs behind the letters and its near half in front, so the orbit has depth.

  Sequence (starts when `play` turns true, i.e. after the deck's loader):
  «دورت», «بگردم؛» drop in → «ایران» pops → the ring draws itself → the traveller starts its 9 s lap.
  With prefers-reduced-motion everything simply appears, and the traveller rests on the near side.
*/

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

// ellipse in a 400×140 box, tilted -8° around its centre
const CX = 200;
const CY = 70;
const RX = 188;
const RY = 30;
const FULL = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 1 1 ${CX + RX} ${CY} A ${RX} ${RY} 0 1 1 ${CX - RX} ${CY}`;
const FAR = `M ${CX - RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX + RX} ${CY}`; // upper half: behind the word
const NEAR = `M ${CX + RX} ${CY} A ${RX} ${RY} 0 0 1 ${CX - RX} ${CY}`; // lower half: in front of it
const TILT = `rotate(-8 ${CX} ${CY})`;
const LAP = "9s";

function Ring({ layer, play, id }: { layer: "far" | "near"; play: boolean; id: string }) {
  const ref = useRef<SVGSVGElement>(null);

  // SMIL animations run on the SVG's own clock: hold it at zero until the logotype plays
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!play || reduce) {
      svg.pauseAnimations();
      svg.setCurrentTime(reduce ? 2.6 : 0); // reduced motion: traveller parked on the near side
    } else {
      svg.setCurrentTime(0);
      svg.unpauseAnimations();
    }
  }, [play]);

  const near = layer === "near";
  return (
    <svg
      ref={ref}
      viewBox="0 0 400 140"
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-1/2 w-[165%] -translate-x-1/2 -translate-y-[46%] overflow-visible",
        near ? "z-20" : "z-0",
      )}
    >
      <defs>
        {/* the near layer only paints the lower half of the orbit, in front of the letters */}
        <clipPath id={`near-${id}`}>
          <rect x="-20" y={CY} width="440" height="100" transform={TILT} />
        </clipPath>
      </defs>
      <g transform={TILT}>
        <path
          d={near ? NEAR : FAR}
          fill="none"
          stroke="var(--saffron)"
          strokeWidth={near ? 4.5 : 3.5}
          strokeLinecap="round"
          strokeDasharray="10 9"
          opacity={near ? 1 : 0.55}
          pathLength={600}
          style={{ ["--route-len" as string]: 600 }}
          className={cn(
            "[stroke-dashoffset:600]",
            play && "motion-safe:animate-[route-draw_1.1s_0.75s_cubic-bezier(.6,0,.2,1)_forwards] motion-reduce:[stroke-dashoffset:0]",
          )}
        />
        <g clipPath={near ? `url(#near-${id})` : undefined}>
          <circle r={near ? 8 : 6} fill="var(--anar)" stroke="var(--paper)" strokeWidth="2.5" opacity={near ? 1 : 0.7}>
            <animate attributeName="opacity" from="0" to={near ? 1 : 0.7} begin="1.7s" dur="0.3s" fill="freeze" />
            <animateMotion path={FULL} begin="1.7s" dur={LAP} repeatCount="indefinite" rotate="auto" />
          </circle>
        </g>
      </g>
    </svg>
  );
}

export function HeroLogotype({ play = true, className }: { play?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  // class names spelled out in full so Tailwind can see them
  const first = cn("inline-block opacity-0", play && "motion-safe:animate-[word-drop_.6s_0s_cubic-bezier(.2,.9,.3,1.2)_forwards] motion-reduce:opacity-100");
  const second = cn("inline-block opacity-0", play && "motion-safe:animate-[word-drop_.6s_.12s_cubic-bezier(.2,.9,.3,1.2)_forwards] motion-reduce:opacity-100");

  return (
    <h1
      className={cn("app-fg text-display flex flex-col items-center text-center leading-none", className)}
      aria-label="دورت بگردم؛ ایران"
    >
      <span className="flex gap-[0.28em] text-[clamp(1.6rem,3vw,2.5rem)]" aria-hidden>
        <span className={first}>دورت</span>
        <span className={second}>بگردم؛</span>
      </span>
      <span className="relative mt-[0.06em] inline-block px-[0.2em] text-[clamp(3.2rem,6.4vw,5.4rem)]" aria-hidden>
        <Ring layer="far" play={play} id={id} />
        <span
          className={cn(
            "relative z-10 inline-block [color:var(--app-fg,var(--lapis))] opacity-0",
            play && "motion-safe:animate-[word-pop_.7s_.32s_cubic-bezier(.2,.9,.3,1.35)_forwards] motion-reduce:opacity-100",
          )}
        >
          ایران
        </span>
        <Ring layer="near" play={play} id={id} />
      </span>
    </h1>
  );
}
