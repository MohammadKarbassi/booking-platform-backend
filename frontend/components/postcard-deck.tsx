"use client";

/*
  The home page's postcard deck, rebuilt after the motion of Netflix's "Voyage en France" guide page
  (studied with REA: its three.js scene, gesture handlers and sound map). Same behaviour, our own assets:
  - a 0→100 loader while the photos load, then the cards grow from the centre one after another
    (0.02 s stagger, expo-out, a random tilt of about ±6°) and fan out into an endless row, with a whoosh;
  - wheel, drag and arrow keys move the row; the motion is eased every frame (lerp), so it glides and settles;
  - while the row moves, cards turn in 3D with its speed; a hovered card lifts and tilts toward the pointer,
    ticks like a flicked postcard, then plays the sound of its place.
  Rendered with CSS 3D transforms from one requestAnimationFrame loop instead of WebGL.
*/

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { fa, tomanShort } from "@/lib/format";
import { scapeFor, soundRank, useSound } from "@/lib/sound";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import type { StayCard } from "@/lib/types";

const CARD_RATIO = 0.72; // portrait postcard
const MIN_CARDS = 8; // fewer stays are repeated so the row still loops

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
/** distance of card i from the centre, wrapped into [-n/2, n/2) so the row never ends */
const wrap = (v: number, n: number) => {
  const m = ((v % n) + n) % n;
  return m >= n / 2 ? m - n : m;
};
/** the same small random-looking tilt for a card on every render (±6°) */
const tiltOf = (i: number) => ((((i * 7919) % 23) / 22) - 0.5) * 12;

/**
 * The page background a card asks for on hover. The reference site stores one per guide; here it is taken
 * from the photo: a saturation-weighted average, pushed to a deep tone so light text stays readable on it.
 */
function deepColorOf(img: HTMLImageElement): string | null {
  const c = document.createElement("canvas");
  c.width = c.height = 24;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(img, 0, 0, 24, 24);
  const d = g.getImageData(0, 0, 24, 24).data;
  let r = 0, gr = 0, b = 0, wsum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]), min = Math.min(d[i], d[i + 1], d[i + 2]);
    const w = 0.15 + (max - min) / 255; // colourful pixels count more than grey sky or snow
    r += d[i] * w; gr += d[i + 1] * w; b += d[i + 2] * w; wsum += w;
  }
  r /= wsum * 255; gr /= wsum * 255; b /= wsum * 255;
  const max = Math.max(r, gr, b), min = Math.min(r, gr, b);
  let h = 0;
  if (max !== min) {
    const dd = max - min;
    h = max === r ? (gr - b) / dd + (gr < b ? 6 : 0) : max === gr ? (b - r) / dd + 2 : (r - gr) / dd + 4;
    h *= 60;
  }
  const sat = Math.min(0.62, Math.max(0.42, ((max - min) / (1 - Math.abs(max + min - 1) || 1)) * 1.25));
  return `hsl(${Math.round(h)} ${Math.round(sat * 100)}% 27%)`;
}

/** Same mechanism as the reference: one CSS variable on the page, eased by a 0.3 s transition in globals.css. */
function setAppBackground(color: string | null) {
  const root = document.documentElement.style;
  if (color) {
    root.setProperty("--app-bg", color);
    root.setProperty("--app-fg", "#f7f6f1");
  } else {
    root.removeProperty("--app-bg");
    root.removeProperty("--app-fg");
  }
}

function splitTitle(title: string): [string, string] {
  const words = title.split(" ");
  if (words.length < 2) return [title, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

type CardAnim = { rx: number; ry: number; z: number };

export function PostcardDeck({ stays, title }: { stays: StayCard[]; title: React.ReactNode }) {
  const router = useRouter();
  const sound = useSound();
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const items = useMemo(() => {
    if (!stays.length) return [];
    // best-sounding places first, like a playlist
    const ranked = [...stays].sort((a, b) => soundRank(a.slug, a.city) - soundRank(b.slug, b.city));
    const out: StayCard[] = [];
    while (out.length < MIN_CARDS) out.push(...ranked);
    return out.slice(0, Math.max(MIN_CARDS, stays.length));
  }, [stays]);
  const n = items.length;

  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLAnchorElement | null)[]>([]);
  const st = useRef({
    target: 0,
    current: 0,
    last: 0,
    step: 540,
    hovered: null as number | null,
    mouse: { x: 0, y: 0 },
    anim: [] as CardAnim[],
    introAt: 0, // 0 = not started
    dragging: false,
    lastX: 0,
    lastT: 0,
    moved: 0,
    suppressClick: false,
    snapTimer: 0 as number | ReturnType<typeof setTimeout>,
    reduce: false,
    scrolling: false,
    scrollTimer: 0 as number | ReturnType<typeof setTimeout>,
  });
  const colors = useRef(new Map<string, string>());

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [loaded, setLoaded] = useState(0);
  const [count, setCount] = useState(0);
  const [loaderGone, setLoaderGone] = useState(false);
  const [active, setActive] = useState(0);

  // ---- loader: count to 100 while the photos arrive (and read each photo's colour on the way) ----
  useEffect(() => {
    if (!n) return;
    let done = 0;
    let cancelled = false;
    const urls = [...new Set(items.map((s) => s.cover_image).filter(Boolean))] as string[];
    urls.forEach((u) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = deepColorOf(img);
          if (c) colors.current.set(u, c);
        } catch {
          /* a cross-origin photo without CORS can't be read; that card simply keeps the plain background */
        }
        img.onerror?.(new Event("load"));
      };
      img.onerror = () => {
        done += 1;
        const frac = done / urls.length;
        if (!cancelled) setLoaded((v) => Math.max(v, frac));
      };
      img.src = u;
    });
    // a slow connection must not hold the page behind the counter
    const giveUp = setTimeout(() => setLoaded(1), 6000);
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
    };
  }, [items, n]);

  const loadedRef = useRef(0);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    if (loaderGone || !n) return;
    let raf = 0;
    const started = performance.now();
    const tick = () => {
      // never faster than ~0.9 s, never ahead of the real loading
      const cap = Math.min(loadedRef.current, (performance.now() - started) / 900) * 100;
      setCount((c) => Math.min(cap, c + Math.max(0.6, (cap - c) * 0.12)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loaderGone, n]);

  useEffect(() => () => setAppBackground(null), []);

  useEffect(() => {
    if (loaderGone || count < 99.5 || loaded < 1) return;
    const t = setTimeout(() => {
      setLoaderGone(true);
      st.current.introAt = performance.now();
      soundRef.current.sfx("sliderIn");
    }, 250);
    return () => clearTimeout(t);
  }, [count, loaded, loaderGone]);

  // ---- sizes ----
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const resize = () => {
      const mobile = window.innerWidth < 768;
      // tall enough to dominate, but never wider than ~78% of a phone and clear of the title and the journal bar
      const h = Math.round(Math.min(el.clientHeight * (mobile ? 0.58 : 0.72), 640, (el.clientWidth * 0.78) / CARD_RATIO));
      const w = Math.round(h * CARD_RATIO);
      const gap = mobile ? 40 : 80;
      el.style.setProperty("--card-w", `${w}px`);
      el.style.setProperty("--card-h", `${h}px`);
      st.current.step = w + gap;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- the frame loop ----
  useEffect(() => {
    if (!n) return;
    const s = st.current;
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    s.anim = Array.from({ length: n }, () => ({ rx: 0, ry: 0, z: 0 }));
    let raf = 0;
    let lastActive = -1;
    const frame = () => {
      s.current = s.reduce ? s.target : lerp(s.current, s.target, 0.085);
      const speed = s.current - s.last;
      s.last = s.current;
      const intro = s.introAt ? (performance.now() - s.introAt) / 1000 : -1;
      for (let i = 0; i < n; i++) {
        const el = cards.current[i];
        if (!el) continue;
        const a = s.anim[i];
        const l = wrap(i - s.current, n);
        const grow = s.reduce ? (intro >= 0 ? 1 : 0) : easeOutExpo(clamp((intro - i * 0.02) / 1, 0, 1));
        const spread = s.reduce ? (intro >= 0 ? 1 : 0) : easeOutExpo(clamp((intro - 0.75) / 1.1, 0, 1));
        const hovered = s.hovered === i && !s.dragging && spread > 0.98;
        const tryY = hovered ? s.mouse.x * 18 : clamp(-speed * 1500, -30, 30);
        a.ry = s.reduce ? 0 : lerp(a.ry, tryY, 0.12);
        a.rx = s.reduce ? 0 : lerp(a.rx, hovered ? -s.mouse.y * 12 : 0, 0.12);
        a.z = lerp(a.z, hovered ? 70 : 0, 0.12);
        const x = -l * s.step * spread; // RTL: the next card arrives from the left
        const y = Math.abs(l) * 16 * spread;
        const stack = (1 - spread) * -i * 3;
        el.style.transform =
          `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${(a.z + stack).toFixed(1)}px) ` +
          `rotateX(${a.rx.toFixed(2)}deg) rotateY(${a.ry.toFixed(2)}deg) rotateZ(${(tiltOf(i) * (hovered ? 0.4 : 1)).toFixed(2)}deg) scale(${grow.toFixed(3)})`;
        el.style.zIndex = String(spread < 1 ? n - i : Math.round(200 - Math.abs(l) * 10 + (hovered ? 50 : 0)));
      }
      const idx = ((Math.round(s.current) % n) + n) % n;
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [n]);

  // ---- input: wheel, drag, keys ----
  useEffect(() => {
    const el = stage.current;
    if (!el || !n) return;
    const s = st.current;
    const snapSoon = (ms = 160) => {
      clearTimeout(s.snapTimer);
      s.snapTimer = setTimeout(() => (s.target = Math.round(s.target)), ms);
    };
    const endHover = () => {
      s.scrolling = true;
      clearTimeout(s.scrollTimer);
      s.scrollTimer = setTimeout(() => (s.scrolling = false), 200);
      if (s.hovered !== null) {
        s.hovered = null;
        setAppBackground(null);
        soundRef.current.stop();
      }
    };
    const onWheel = (e: WheelEvent) => {
      // the page continues below the deck, so an ordinary (vertical) wheel scrolls the page;
      // a sideways trackpad swipe or shift+wheel turns the cards
      const sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      if (!s.introAt || !sideways) return;
      e.preventDefault();
      endHover();
      s.target += ((e.shiftKey ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 30 : 1)) / s.step;
      snapSoon();
    };
    const onMove = (e: PointerEvent) => {
      if (!s.dragging) return;
      const now = performance.now();
      const dx = e.clientX - s.lastX;
      const v = Math.abs(dx) / Math.max(1, now - s.lastT); // px per ms
      s.moved += Math.abs(dx);
      if (s.moved > 6) endHover();
      s.target += (dx * (0.7 + Math.min(v, 2.5) * 0.5)) / s.step;
      s.lastX = e.clientX;
      s.lastT = now;
      if (s.moved > 6) document.body.style.cursor = "grabbing";
    };
    const onUp = () => {
      if (!s.dragging) return;
      s.dragging = false;
      if (s.moved > 6) s.suppressClick = true;
      document.body.style.cursor = "";
      snapSoon(120);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !s.introAt) return;
      s.dragging = true;
      s.moved = 0;
      s.suppressClick = false;
      s.lastX = e.clientX;
      s.lastT = performance.now();
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [n]);

  const go = (delta: number) => {
    const s = st.current;
    s.target = Math.round(s.target) + delta;
  };
  const focusCard = (i: number) => {
    const s = st.current;
    s.target = Math.round(s.current + wrap(i - s.current, n));
  };

  const current = items[active];

  return (
    <div
      ref={stage}
      role="region"
      aria-roledescription="کاروسل"
      aria-label="کارت‌پستال‌های اقامتگاه‌ها؛ با چرخ ماوس، کشیدن یا کلیدهای جهت ورق بزن"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          go(e.key === "ArrowLeft" ? 1 : -1);
        }
      }}
      className="relative h-full w-full cursor-grab touch-pan-y overflow-hidden outline-none select-none focus-visible:ring-4 focus-visible:ring-saffron/60 focus-visible:ring-inset"
      style={{ perspective: "1600px" }}
    >
      {/* title over the deck, like the reference page's centred logotype */}
      <div className="pointer-events-none absolute inset-x-0 top-[3%] z-[400] flex justify-center">{title}</div>

      <div className="absolute inset-x-0 top-[58%] h-0 [transform-style:preserve-3d]">
        {items.map((s, i) => {
          const [l1, l2] = splitTitle(s.title);
          return (
            <Link
              key={`${s.id}-${i}`}
              ref={(el) => {
                cards.current[i] = el;
              }}
              href={`/stays/${s.id}`}
              draggable={false}
              data-sfx="off"
              aria-label={`${s.title}، ${s.city}، شبی از ${tomanShort(s.base_price_per_night)} تومان`}
              onFocus={() => focusCard(i)}
              onClick={(e) => {
                if (st.current.suppressClick) {
                  e.preventDefault();
                  st.current.suppressClick = false;
                  return;
                }
                sound.sfx("click");
                e.preventDefault();
                router.push(`/stays/${s.id}`);
              }}
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse" || st.current.dragging || st.current.scrolling || !st.current.introAt) return;
                st.current.hovered = i;
                setAppBackground(s.cover_image ? (colors.current.get(s.cover_image) ?? null) : null);
                sound.play(scapeFor(s.slug, s.city));
              }}
              onPointerMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                st.current.mouse = { x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 };
              }}
              onPointerLeave={() => {
                if (st.current.hovered !== i) return;
                st.current.hovered = null;
                setAppBackground(null);
                sound.stop();
              }}
              className="group absolute top-0 left-1/2 block h-[var(--card-h)] w-[var(--card-w)] will-change-transform outline-none [transform:translate3d(-50%,-50%,0)_scale(0)] focus-visible:[&>div]:ring-4 focus-visible:[&>div]:ring-saffron"
            >
              <div className="relative size-full rounded-[3px] bg-[#f7f6f1] p-[3.4%] shadow-[0_1px_0_rgb(23_32_61/0.1),0_40px_60px_-30px_rgb(23_32_61/0.6),0_18px_30px_-20px_rgb(23_32_61/0.35)]">
                <div className="relative size-full overflow-hidden bg-ink/10">
                  {s.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.cover_image} alt="" draggable={false} className="size-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(10_14_30/0.78),rgb(10_14_30/0.15)_38%,transparent_60%)]" />

                  {/* stamp + cancellation waves in the top corner */}
                  <div className="absolute top-[3.5%] left-[4%] flex items-center">
                    <div className="stamp w-[23%] min-w-14 rotate-[4deg] shadow-sm [--tooth:4px]">
                      <div className="grid aspect-[4/5] place-items-center bg-paper">
                        <BrandMark className="size-[70%]" />
                      </div>
                    </div>
                  </div>
                  <svg viewBox="0 0 120 50" className="absolute top-[5.5%] left-[19%] w-[36%] text-anar/90" aria-hidden>
                    {[8, 18, 28, 38].map((y) => (
                      <path key={y} d={`M0 ${y} q 7.5 -5 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0 t 15 0`} fill="none" stroke="currentColor" strokeWidth="2.4" />
                    ))}
                  </svg>

                  {/* title, set like a vintage postcard caption */}
                  <div className="absolute inset-x-[6%] bottom-[5%] text-white">
                    <p className="text-display leading-[0.95] drop-shadow-[0_2px_10px_rgb(0_0_0/0.45)]" style={{ fontSize: "calc(var(--card-w) * 0.12)" }}>
                      <span className="block">{l1}</span>
                      {l2 && <span className="block text-saffron">{l2}</span>}
                    </p>
                    <p className="mt-[3%] flex items-center justify-between text-[clamp(11px,calc(var(--card-w)*0.034),15px)] font-semibold text-white/85">
                      <span>{s.city}، {s.province}</span>
                      <span>شبی از {tomanShort(s.base_price_per_night)} تومان</span>
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* previous / next, for mouse users now that the wheel scrolls the page */}
      <div className="absolute inset-x-0 top-[58%] z-[420] flex -translate-y-1/2 justify-between px-3 sm:px-6" data-sfx="off">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="کارت قبلی"
          className="pointer-events-auto grid size-12 place-items-center rounded-full border-2 border-ink bg-card/90 shadow-[var(--shadow-journal-sm)] backdrop-blur transition hover:scale-105 active:scale-95"
        >
          <ChevronRight className="size-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="کارت بعدی"
          className="pointer-events-auto grid size-12 place-items-center rounded-full border-2 border-ink bg-card/90 shadow-[var(--shadow-journal-sm)] backdrop-blur transition hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="size-6" />
        </button>
      </div>

      {/* browsers keep audio closed until the first click; say so instead of staying mysteriously silent */}
      {sound.enabled && !sound.unlocked && loaderGone && (
        <button
          type="button"
          onClick={() => sound.sfx("click")}
          className="absolute top-[3%] left-4 z-[430] hidden items-center gap-2 rounded-full border-[1.5px] border-ink bg-card/90 px-3 py-1.5 text-sm font-semibold backdrop-blur sm:flex"
        >
          <Volume2 className="size-4 text-lapis motion-safe:animate-pulse" />
          برای شنیدن صدای هر مکان، یک بار کلیک کن
        </button>
      )}

      <p className="sr-only" aria-live="polite">
        {current ? `کارت ${fa(active + 1)} از ${fa(n)}: ${current.title}، ${current.city}` : ""}
      </p>

      {/* loader: counts to 100 while the photos load, then the deck is dealt (portalled: the stage's perspective
          would otherwise trap a fixed overlay inside it) */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[1000] grid place-items-center bg-paper transition-opacity duration-500 ${loaderGone || !n ? "pointer-events-none opacity-0" : "opacity-100"}`}
            aria-hidden={loaderGone || !n}
          >
            <span className="text-display text-7xl text-ink tabular-nums" role="status" aria-label="در حال آماده کردن کارت‌پستال‌ها">
              {fa(Math.floor(count))}
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
}
