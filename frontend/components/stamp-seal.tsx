import { cn } from "@/lib/utils";

/** The big rubber-stamp impression shown when something is confirmed. */
export function StampSeal({
  title,
  sub,
  color = "var(--firoozeh)",
  className,
}: {
  title: string;
  sub?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-grid size-40 place-items-center rounded-full border-[5px] border-double p-3 text-center motion-safe:animate-[stamp-in_.55s_cubic-bezier(.2,1.4,.4,1)_both]",
        className,
      )}
      style={{ borderColor: color, color, transform: "rotate(-10deg)" }}
      role="img"
      aria-label={title}
    >
      <div className="grid size-full place-items-center rounded-full border-2 border-dashed" style={{ borderColor: color }}>
        <div>
          <div className="text-display text-3xl leading-none">{title}</div>
          {sub && <div className="mt-1 text-[11px] font-bold">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
