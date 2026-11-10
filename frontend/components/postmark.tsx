import { useId } from "react";
import { cn } from "@/lib/utils";

/** Round postmark with the city name running around the rim, plus the wavy cancellation lines. */
export function Postmark({
  city,
  date,
  className,
  color = "var(--anar)",
  waves = true,
}: {
  city: string;
  date?: string;
  className?: string;
  color?: string;
  waves?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 150 70" className={cn("pointer-events-none", className)} aria-hidden style={{ color }}>
      {waves &&
        [16, 26, 36, 46, 56].map((y) => (
          <path
            key={y}
            d={`M0 ${y} q 9 -6 18 0 t 18 0 t 18 0 t 18 0`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.75"
            transform="translate(78 0)"
          />
        ))}
      <circle cx="40" cy="35" r="32" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
      <circle cx="40" cy="35" r="23" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      <defs>
        {/* upper arc, drawn left→right so the browser's bidi keeps Persian readable on it */}
        <path id={`rim-${id}`} d="M 13 35 A 27 27 0 0 1 67 35" />
      </defs>
      <text fontSize="7.5" fontWeight="800" fill="currentColor" opacity="0.9" textAnchor="middle">
        <textPath href={`#rim-${id}`} startOffset="50%">
          ★ دور ایران ★
        </textPath>
      </text>
      <text x="40" y={date ? 36 : 39} fontSize={city.length > 6 ? 9 : 11} textAnchor="middle" fill="currentColor" fontWeight="900">
        {city}
      </text>
      {date && (
        <text x="40" y="48" fontSize="7.5" textAnchor="middle" fill="currentColor" fontWeight="700">
          {date}
        </text>
      )}
    </svg>
  );
}
