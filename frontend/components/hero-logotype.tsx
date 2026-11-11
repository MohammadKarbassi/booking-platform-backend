"use client";

/*
  The site's logotype: «دورت بگردم؛» over «ایران», with a red map pin landing on the start of «دورت».
  Type: Vazirmatn Black for the first line, Vazirmatn Medium for «ایران» (the self-hosted font in app/fonts).

  Entrance (starts when `play` turns true, i.e. after the deck's loader):
  «دورت», «بگردم؛» rise in → «ایران» appears and its orbit ring draws itself → the pin drops from above and lands with a bounce,
  then bobs gently over a faint pulse, like a live location on a map.
  With prefers-reduced-motion everything simply appears in place.
*/

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

/* The orbit around «ایران»: "دورت بگردم" = "let me circle around you". A tilted ring whose far half runs
   behind the word and near half in front, with a small red traveller going round it every 9 s. */
// ellipse in a 400×140 box, tilted -8° around its centre
const CX = 200;
const CY = 70;
const RX = 188;
const RY = 38;
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
        "pointer-events-none absolute top-1/2 left-1/2 w-[200%] -translate-x-1/2 -translate-y-[44%] overflow-visible",
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
          strokeWidth={near ? 8 : 6}
          strokeLinecap="round"
          strokeDasharray="16 12"
          opacity={near ? 1 : 0.6}
          pathLength={600}
          style={{ ["--route-len" as string]: 600 }}
          className={cn(
            "[stroke-dashoffset:600]",
            play && "motion-safe:animate-[route-draw_1.1s_0.75s_cubic-bezier(.6,0,.2,1)_forwards] motion-reduce:[stroke-dashoffset:0]",
          )}
        />
        <g clipPath={near ? `url(#near-${id})` : undefined}>
          <circle r={near ? 13 : 10} fill="var(--anar)" stroke="var(--paper)" strokeWidth="4" opacity={near ? 1 : 0.7}>
            <animate attributeName="opacity" from="0" to={near ? 1 : 0.7} begin="1.7s" dur="0.3s" fill="freeze" />
            <animateMotion path={FULL} begin="1.7s" dur={LAP} repeatCount="indefinite" rotate="auto" />
          </circle>
        </g>
      </g>
    </svg>
  );
}


function MapPin({ play }: { play: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-[0.58em] -right-[0.42em] block w-[0.42em]"
    >
      {/* a faint pulse where the pin touches down */}
      <span
        className={cn(
          "absolute top-[118%] left-1/2 block h-[0.12em] w-[0.42em] -translate-x-1/2 rounded-[50%] border-2 border-anar opacity-0",
          play && "motion-safe:animate-[pin-pulse_2.4s_1.6s_ease-out_infinite]",
        )}
      />
      {/* the pin: drop + bounce, then a slow bob */}
      <span
        className={cn(
          "block origin-bottom opacity-0",
          play &&
            "motion-safe:animate-[pin-drop_.9s_.55s_cubic-bezier(.3,1.4,.5,1)_forwards,pin-bob_2.4s_1.6s_ease-in-out_infinite] motion-reduce:opacity-100",
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
  const id = useId().replace(/:/g, "");
  // class names spelled out in full so Tailwind can see them
  const rise1 = cn("inline-block opacity-0", play && "motion-safe:animate-[word-drop_.6s_0s_cubic-bezier(.2,.9,.3,1.2)_forwards] motion-reduce:opacity-100");
  const rise2 = cn("inline-block opacity-0", play && "motion-safe:animate-[word-drop_.6s_.12s_cubic-bezier(.2,.9,.3,1.2)_forwards] motion-reduce:opacity-100");

  return (
    <h1
      className={cn("app-fg flex flex-col items-center text-center font-sans leading-[1.05]", className)}
      aria-label="دورت بگردم؛ ایران"
    >
      <span className="relative flex gap-[0.26em] text-[clamp(2.8rem,6.2vw,5.6rem)] font-black tracking-tight" aria-hidden>
        <span className={rise1}>دورت</span>
        <span className={rise2}>بگردم؛</span>
        <MapPin play={play} />
      </span>
      <span aria-hidden className="relative mt-[0.16em] inline-block px-[0.2em] text-[clamp(1.9rem,3.6vw,3.2rem)] font-medium">
        <Ring layer="far" play={play} id={id} />
        <span
          className={cn(
            "relative z-10 inline-block opacity-0",
            play && "motion-safe:animate-[word-pop_.6s_.32s_cubic-bezier(.2,.9,.3,1.3)_forwards] motion-reduce:opacity-100",
          )}
        >
          ایران
        </span>
        <Ring layer="near" play={play} id={id} />
      </span>
    </h1>
  );
}
