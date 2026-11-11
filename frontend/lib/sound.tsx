"use client";

/*
  Home-page sound, after the reference site (Netflix "Voyage en France", studied with REA):
  - hovering a postcard plays that place's own recording, faded in, until the pointer leaves;
  - interface sounds at 40% volume: a tick on links/buttons, a click, menu in/out, the deck's entrance.
  Place sounds are real field recordings from Wikimedia Commons (public/sounds, credits in CREDITS.md);
  the short interface sounds are synthesised.
  Sound exists only on the home page ("/"). It is on by default, like the reference's "SON ON",
  but browsers allow audio only after the visitor's first click or key press.
*/

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export const SOUNDS = {
  waterfall: "/sounds/waterfall.mp3",
  sea: "/sounds/sea.mp3",
  lagoon: "/sounds/lagoon.mp3",
  rain: "/sounds/rain.mp3",
  forestbirds: "/sounds/forestbirds.mp3",
  birds: "/sounds/birds.mp3",
  brook: "/sounds/brook.mp3",
  fountain: "/sounds/fountain.mp3",
  desert: "/sounds/desert.mp3",
  pines: "/sounds/pines.mp3",
} as const;
export type Scape = keyof typeof SOUNDS;

/** Each postcard sounds like what its photo shows (keyed by the stay's slug). */
const STAY_SCAPE: Record<string, Scape> = {
  "bisheh-waterfall-cabin": "waterfall",
  "ramsar-beach-villa": "sea",
  "anzali-lagoon-house": "lagoon",
  "masuleh-suite": "rain",
  "kelardasht-forest-cabin": "forestbirds",
  "shiraz-garden-suite": "birds",
  "abyaneh-red-lodge": "brook",
  "kashan-mansion": "fountain",
  "isfahan-naqsh-apartment": "fountain",
  "yazd-windcatcher-house": "desert",
  "qeshm-beach-hut": "desert",
  "filband-cloud-cabin": "pines",
  "kandovan-rock-house": "pines",
  "tehran-tochal-flat": "pines",
};
/** For stays added later from the admin panel. */
const CITY_SCAPE: Record<string, Scape> = {
  رامسر: "sea",
  قشم: "sea",
  "بندر انزلی": "lagoon",
  بیشه: "waterfall",
  ماسوله: "rain",
  کلاردشت: "forestbirds",
  فیلبند: "pines",
  کندوان: "pines",
  تهران: "pines",
  ابیانه: "brook",
  یزد: "desert",
  شیراز: "birds",
};
export const scapeFor = (slug: string, city: string): Scape => STAY_SCAPE[slug] ?? CITY_SCAPE[city] ?? "fountain";

/** The deck opens with the best-sounding places first. */
const SOUND_ORDER: Scape[] = ["waterfall", "sea", "lagoon", "rain", "forestbirds", "birds", "brook", "fountain", "desert", "pines"];
export const soundRank = (slug: string, city: string) => SOUND_ORDER.indexOf(scapeFor(slug, city));

export type Sfx = "hover" | "click" | "menuIn" | "menuOut" | "sliderIn";

/** The reference plays every effect at 0.4 of full volume. */
const SFX_VOLUME = 0.4;
const SCAPE_VOLUME = 0.7;

function noise(ac: AudioContext, seconds: number) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * seconds), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function playSfx(ac: AudioContext, name: Sfx) {
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = SFX_VOLUME;
  out.connect(ac.destination);
  const blip = (f0: number, f1: number, dur: number, peak: number, at = t) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.02);
  };
  const swish = (from: number, to: number, dur: number, peak: number, q = 1.2, at = t) => {
    const n = ac.createBufferSource();
    n.buffer = noise(ac, dur + 0.1);
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, at);
    bp.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    n.connect(bp).connect(g).connect(out);
    n.start(at);
    n.stop(at + dur + 0.05);
  };
  switch (name) {
    case "hover": // a dry tick, like a pencil touching paper
      blip(2600, 1900, 0.035, 0.18);
      break;
    case "click": // small rubber stamp
      blip(180, 70, 0.12, 0.9);
      swish(1400, 700, 0.06, 0.5, 0.8);
      break;
    case "menuIn": // a notebook opening
      swish(500, 2400, 0.32, 0.6, 1.4);
      break;
    case "menuOut":
      swish(2400, 500, 0.28, 0.5, 1.4);
      break;
    case "sliderIn": // postcards dealt onto the table
      swish(250, 3000, 0.75, 0.7, 0.9);
      [0.18, 0.3, 0.42, 0.56].forEach((d) => swish(3600, 2200, 0.05, 0.35, 3, t + d));
      break;
  }
}

type SoundState = {
  /** true only on the home page */
  available: boolean;
  enabled: boolean;
  /** false until the browser lets audio start (first click / key press) */
  unlocked: boolean;
  toggle: () => void;
  play: (scape: Scape) => void;
  stop: () => void;
  sfx: (name: Sfx) => void;
  playing: Scape | null;
};

const SoundContext = createContext<SoundState | null>(null);
const KEY = "dor-iran-sound";

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const available = usePathname() === "/";
  const [enabled, setEnabled] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [playing, setPlaying] = useState<Scape | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const buffers = useRef(new Map<Scape, AudioBuffer>());
  const current = useRef<{ src: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const live = useRef({ enabled: true, available });

  useEffect(() => {
    live.current = { enabled, available };
  }, [enabled, available]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a per-viewer preference after hydration
      setEnabled(localStorage.getItem(KEY) !== "off");
    } catch {
      /* storage blocked: stays on */
    }
  }, []);

  const ctx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  /** Effects are skipped (not queued) until audio may play, and everywhere except the home page. */
  const ready = () =>
    Boolean(live.current.enabled && live.current.available && ctxRef.current?.state === "running");

  // fetch and decode the recordings once, on the home page (decoding is allowed before the first gesture)
  useEffect(() => {
    if (!available || buffers.current.size) return;
    const ac = ctx();
    (Object.entries(SOUNDS) as [Scape, string][]).forEach(([k, url]) => {
      fetch(url)
        .then((r) => r.arrayBuffer())
        .then((b) => ac.decodeAudioData(b))
        .then((buf) => buffers.current.set(k, buf))
        .catch(() => {
          /* that card just stays silent */
        });
    });
  }, [available, ctx]);

  const sfx = useCallback((name: Sfx) => {
    if (ready()) playSfx(ctxRef.current!, name);
  }, []);

  const stop = useCallback(() => {
    const c = current.current;
    const ac = ctxRef.current;
    if (!c || !ac) return;
    const t = ac.currentTime;
    c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setValueAtTime(c.gain.gain.value, t);
    c.gain.gain.linearRampToValueAtTime(0, t + 0.4); // 0.4 s out, as on the reference
    c.src.stop(t + 0.45);
    current.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback(
    (scape: Scape) => {
      if (!ready()) return;
      const buf = buffers.current.get(scape);
      if (!buf) return;
      stop();
      const ac = ctxRef.current!;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = ac.createGain();
      const t = ac.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(SCAPE_VOLUME, t + 0.35);
      src.connect(gain).connect(ac.destination);
      src.start(t, Math.random() * Math.max(0, buf.duration - 4)); // a different moment each time
      current.current = { src, gain };
      setPlaying(scape);
    },
    [stop],
  );

  // leaving the home page silences everything at once
  useEffect(() => {
    if (!available) stop();
  }, [available, stop]);

  // Home page only: every link/button ticks on hover and stamps on click; the first gesture unlocks audio.
  useEffect(() => {
    if (!available) return;
    const unlock = () => {
      if (!live.current.enabled) return;
      const ac = ctx();
      if (ac.state !== "running") ac.resume().then(() => setUnlocked(true)).catch(() => {});
      else setUnlocked(true);
    };
    const target = (e: Event) => (e.target as Element | null)?.closest?.("a,button,[role=button]") ?? null;
    const over = (e: PointerEvent) => {
      const el = target(e);
      if (!el || el.closest("[data-sfx=off]")) return;
      const from = (e.relatedTarget as Element | null)?.closest?.("a,button,[role=button]");
      if (from !== el) sfx("hover");
    };
    const click = (e: MouseEvent) => {
      const el = target(e);
      if (el && !el.closest("[data-sfx=off]")) sfx("click");
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    document.addEventListener("pointerover", over);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("click", click, true);
    };
  }, [available, ctx, sfx]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      try {
        localStorage.setItem(KEY, next ? "on" : "off");
      } catch {
        /* not persisted */
      }
      if (!next) stop();
      return next;
    });
  }, [stop]);

  return (
    <SoundContext.Provider value={{ available, enabled, unlocked, toggle, play, stop, sfx, playing }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const s = useContext(SoundContext);
  if (!s) throw new Error("useSound outside SoundProvider");
  return s;
}
