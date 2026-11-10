"use client";

import { useMemo } from "react";
import { Castle, Footprints, Car, Landmark, ShoppingBasket, Trees, UtensilsCrossed, Waves, MapPin } from "lucide-react";
import { fa } from "@/lib/format";
import type { Poi } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CATEGORY_STYLE: Record<string, { color: string; icon: React.ElementType }> = {
  طبیعت: { color: "#129c92", icon: Trees },
  "جاذبهٔ تاریخی": { color: "#2643b5", icon: Castle },
  ساحل: { color: "#1b8fd1", icon: Waves },
  رستوران: { color: "#d68a00", icon: UtensilsCrossed },
  بازار: { color: "#d3263a", icon: ShoppingBasket },
  موزه: { color: "#6b3fa0", icon: Landmark },
};
export const categoryStyle = (c: string) => CATEGORY_STYLE[c] ?? { color: "#17203d", icon: MapPin };

/** Initial compass bearing from a to b, degrees clockwise from north. */
function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function distanceLabel(km: number) {
  return km < 1 ? `${fa(Math.round((km * 1000) / 50) * 50)} متر` : `${fa(km, { maximumFractionDigits: 1 })} کیلومتر`;
}

export function travelHint(km: number): { icon: React.ElementType; text: string } {
  if (km <= 2.5) return { icon: Footprints, text: `${fa(Math.max(1, Math.round((km / 4.5) * 60)))} دقیقه پیاده` };
  return { icon: Car, text: `${fa(Math.max(5, Math.round((km / 35) * 60)))} دقیقه با ماشین` };
}

const NICE = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];

export function DiscoveryRadar({
  center,
  pois,
  activeId,
  onActive,
  className,
}: {
  center: { lat: number; lng: number; label: string };
  pois: Poi[];
  activeId?: number | null;
  onActive?: (id: number | null) => void;
  className?: string;
}) {
  const S = 400;
  const C = S / 2;
  const R = C - 34;

  const { maxD, rings, dots } = useMemo(() => {
    const far = Math.max(1, ...pois.map((p) => p.distance_km));
    const maxD = NICE.find((n) => n >= far * 1.08) ?? far * 1.1;
    // log scale keeps a 50 m bazaar and a 40 km lake on the same dial without crowding the centre
    const MIN_D = 0.03;
    const frac = (d: number) => Math.log(Math.max(d, MIN_D) / MIN_D) / Math.log(maxD / MIN_D);
    const scale = (d: number) => R * (0.14 + 0.86 * frac(d));
    const rings: number[] = [];
    for (const n of NICE.filter((n) => n < maxD)) {
      const last = rings.length ? frac(rings[rings.length - 1]) : 0;
      if (frac(n) - last >= 0.2) rings.push(n);
    }
    rings.push(maxD);
    const dots = pois.map((p) => {
      const b = (bearing(center.lat, center.lng, p.latitude, p.longitude) * Math.PI) / 180;
      const r = scale(p.distance_km);
      return { p, x: C + r * Math.sin(b), y: C - r * Math.cos(b) };
    });
    return { maxD, rings: rings.map((d) => ({ d, r: scale(d) })), dots };
  }, [pois, center.lat, center.lng, C, R]);

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[420px]", className)}>
      {/* rotating sweep */}
      <div
        aria-hidden
        className="absolute inset-[34px] rounded-full motion-safe:animate-[radar-sweep_7s_linear_infinite]"
        style={{ background: "conic-gradient(from 0deg, rgb(242 176 30 / 0.35), transparent 22%)" }}
      />
      <svg viewBox={`0 0 ${S} ${S}`} className="relative size-full" role="img" aria-label={`قطب‌نمای جاذبه‌های اطراف ${center.label}، تا ${fa(maxD)} کیلومتر`}>
        <circle cx={C} cy={C} r={R} fill="rgb(23 32 61 / 0.03)" stroke="var(--ink)" strokeWidth="2" />
        {rings.map(({ d, r }) => (
          <g key={d}>
            <circle cx={C} cy={C} r={r} fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeDasharray="3 5" />
            <text x={C + 4} y={C - r + 13} fontSize="10.5" fill="var(--ink)" fillOpacity="0.6" fontWeight="600">
              {d < 1 ? `${fa(d * 1000)} متر` : `${fa(d)} کیلومتر`}
            </text>
          </g>
        ))}
        {/* compass cross + ticks */}
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="var(--ink)" strokeOpacity="0.12" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="var(--ink)" strokeOpacity="0.12" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i * 5 * Math.PI) / 180;
          const long = i % 18 === 0;
          const r1 = R + 3;
          const r2 = R + (long ? 12 : 6);
          return (
            <line
              key={i}
              x1={C + r1 * Math.sin(a)}
              y1={C - r1 * Math.cos(a)}
              x2={C + r2 * Math.sin(a)}
              y2={C - r2 * Math.cos(a)}
              stroke="var(--ink)"
              strokeWidth={long ? 2 : 1}
              strokeOpacity={long ? 0.9 : 0.35}
            />
          );
        })}
        {[
          ["ش", 0],
          ["خ", 90],
          ["ج", 180],
          ["غ", 270],
        ].map(([t, deg]) => {
          const a = ((deg as number) * Math.PI) / 180;
          return (
            <text
              key={t as string}
              x={C + (R + 24) * Math.sin(a)}
              y={C - (R + 24) * Math.cos(a) + 5}
              textAnchor="middle"
              fontSize="15"
              fontWeight="800"
              fill={deg === 0 ? "var(--anar)" : "var(--ink)"}
            >
              {t}
            </text>
          );
        })}

        {/* the stay itself */}
        <circle cx={C} cy={C} r="11" fill="var(--saffron)" stroke="var(--ink)" strokeWidth="2.5" />
        <circle cx={C} cy={C} r="3.5" fill="var(--ink)" />

        {dots.map(({ p, x, y }) => {
          const st = categoryStyle(p.category);
          const active = activeId === p.id;
          return (
            <g
              key={p.id}
              tabIndex={0}
              role="button"
              aria-label={`${p.name}، ${p.category}، ${distanceLabel(p.distance_km)}`}
              onMouseEnter={() => onActive?.(p.id)}
              onMouseLeave={() => onActive?.(null)}
              onFocus={() => onActive?.(p.id)}
              onBlur={() => onActive?.(null)}
              className="cursor-pointer outline-none"
            >
              <line x1={C} y1={C} x2={x} y2={y} stroke={st.color} strokeWidth="1.5" strokeDasharray="2 4" opacity={active ? 0.9 : 0} />
              {active && (
                <circle cx={x} cy={y} r="9" fill={st.color} className="origin-center motion-safe:animate-[ping-soft_1.2s_ease-out_infinite]" style={{ transformBox: "fill-box" }} />
              )}
              <circle cx={x} cy={y} r={active ? 10 : 8} fill={st.color} stroke="#fff" strokeWidth="2.5" />
              {active && (
                <g>
                  <rect
                    x={x - Math.min(90, p.name.length * 4.6 + 14)}
                    y={y - 38}
                    width={Math.min(180, p.name.length * 9.2 + 28)}
                    height="24"
                    rx="12"
                    fill="var(--ink)"
                  />
                  <text x={x} y={y - 21.5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
                    {p.name}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** The list that sits beside the radar; hovering a row lights its dot. */
export function PoiList({
  pois,
  activeId,
  onActive,
}: {
  pois: Poi[];
  activeId?: number | null;
  onActive?: (id: number | null) => void;
}) {
  return (
    <ul className="divide-y divide-dashed divide-ink/20">
      {pois.map((p) => {
        const st = categoryStyle(p.category);
        const hint = travelHint(p.distance_km);
        return (
          <li
            key={p.id}
            onMouseEnter={() => onActive?.(p.id)}
            onMouseLeave={() => onActive?.(null)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors",
              activeId === p.id && "bg-saffron/15",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full text-white" style={{ background: st.color }}>
              <st.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.name}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{p.category}</span>
                <span aria-hidden>•</span>
                <hint.icon className="size-3.5" aria-hidden />
                <span>{hint.text}</span>
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums">{distanceLabel(p.distance_km)}</span>
          </li>
        );
      })}
    </ul>
  );
}
