"use client";

/*
  Postcard soundscapes, synthesised live with the Web Audio API (no audio files to license or download).
  On by default like the reference site's "SON ON", but nothing plays until the visitor's first click or key press
  (browsers block audio before a gesture). The header toggle turns it off.
*/

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type Scape = "sea" | "forest" | "mountain" | "desert" | "garden";

export const scapeLabel: Record<Scape, string> = {
  sea: "صدای موج",
  forest: "صدای جنگل",
  mountain: "صدای کوهستان",
  desert: "باد کویر",
  garden: "فوارهٔ باغ ایرانی",
};

const CITY_SCAPE: Record<string, Scape> = {
  رامسر: "sea",
  قشم: "sea",
  کلاردشت: "forest",
  فیلبند: "forest",
  ماسوله: "mountain",
  ابیانه: "mountain",
  کندوان: "mountain",
  یزد: "desert",
  کاشان: "garden",
  اصفهان: "garden",
  شیراز: "garden",
  تهران: "garden",
};

export const scapeForCity = (city: string): Scape => CITY_SCAPE[city] ?? "garden";

type Voice = { stop: () => void };

function noiseBuffer(ctx: AudioContext, kind: "white" | "pink" | "brown", seconds = 4) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === "white") d[i] = w * 0.5;
    else if (kind === "pink") {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
  }
  return buf;
}

function loopNoise(ctx: AudioContext, kind: "white" | "pink" | "brown") {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, kind);
  src.loop = true;
  return src;
}

function lfo(ctx: AudioContext, freq: number, depth: number, target: AudioParam) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

function chirp(ctx: AudioContext, out: AudioNode, base: number) {
  const notes = 2 + Math.floor(Math.random() * 4);
  let t = ctx.currentTime;
  for (let i = 0; i < notes; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = base * (0.85 + Math.random() * 0.4);
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (Math.random() > 0.5 ? 1.5 : 0.7), t + 0.07);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.1);
    t += 0.1 + Math.random() * 0.08;
  }
}

function build(ctx: AudioContext, scape: Scape, out: AudioNode): Voice {
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  const birds = (base: number, every: number) =>
    timers.push(window.setInterval(() => Math.random() < 0.6 && chirp(ctx, out, base), every));

  if (scape === "sea") {
    // brown noise, low-passed, swelling in and out like waves
    const src = loopNoise(ctx, "brown");
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 650;
    const swell = ctx.createGain();
    swell.gain.value = 0.55;
    nodes.push(src, lfo(ctx, 0.11, 0.4, swell.gain), lfo(ctx, 0.11, 350, lp.frequency));
    src.connect(lp).connect(swell).connect(out);
    src.start();
  }
  if (scape === "desert" || scape === "mountain") {
    // band-passed pink noise whose centre drifts: wind
    const src = loopNoise(ctx, "pink");
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = scape === "desert" ? 1.4 : 0.9;
    bp.frequency.value = scape === "desert" ? 700 : 500;
    const g = ctx.createGain();
    g.gain.value = scape === "desert" ? 0.9 : 0.45;
    nodes.push(src, lfo(ctx, 0.07, 380, bp.frequency), lfo(ctx, 0.05, 0.3, g.gain));
    src.connect(bp).connect(g).connect(out);
    src.start();
  }
  if (scape === "garden" || scape === "mountain") {
    // fountain / stream: bright noise with fast random amplitude flutter
    const src = loopNoise(ctx, "white");
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = scape === "garden" ? 2400 : 1600;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.12;
    src.connect(bp).connect(g).connect(out);
    src.start();
    nodes.push(src);
    timers.push(window.setInterval(() => g.gain.setTargetAtTime(0.06 + Math.random() * 0.12, ctx.currentTime, 0.02), 60));
  }
  if (scape === "forest") {
    const src = loopNoise(ctx, "pink");
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    nodes.push(src, lfo(ctx, 0.06, 0.15, g.gain));
    src.connect(lp).connect(g).connect(out);
    src.start();
    birds(3200, 900);
    birds(4400, 1700);
  }
  if (scape === "garden") birds(3800, 1400);
  if (scape === "mountain") birds(2800, 2300);

  return {
    stop: () => {
      timers.forEach(clearInterval);
      nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      });
    },
  };
}

/** Short interface effects, after the Netflix guide page's set: hover, click, menu in/out, slider in. */
export type Sfx = "hover" | "hoverCard" | "click" | "menuIn" | "menuOut" | "sliderIn";

/** Netflix plays every effect at 0.4 of full volume; the same master level is used here. */
const SFX_VOLUME = 0.4;

function playSfx(ac: AudioContext, name: Sfx) {
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.value = SFX_VOLUME;
  out.connect(ac.destination);
  const blip = (f0: number, f1: number, dur: number, peak: number, type: OscillatorType = "sine", at = t) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
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
    n.buffer = noiseBuffer(ac, "white", dur + 0.1);
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
    case "hoverCard": // a postcard flicked between two fingers
      swish(4200, 2600, 0.09, 0.55, 2.2);
      blip(420, 260, 0.06, 0.25, "triangle");
      break;
    case "click": // small rubber stamp
      blip(180, 70, 0.12, 0.9);
      swish(1400, 700, 0.06, 0.5, 0.8);
      break;
    case "menuIn": // a notebook opening: rising swish
      swish(500, 2400, 0.32, 0.6, 1.4);
      break;
    case "menuOut":
      swish(2400, 500, 0.28, 0.5, 1.4);
      break;
    case "sliderIn": // cards dealt onto the table: a long whoosh with a few paper taps
      swish(250, 3000, 0.75, 0.7, 0.9);
      [0.18, 0.3, 0.42, 0.56].forEach((d) => swish(3600, 2200, 0.05, 0.35, 3, t + d));
      break;
  }
}

type SoundState = {
  enabled: boolean;
  toggle: () => void;
  play: (scape: Scape) => void;
  stop: () => void;
  stamp: () => void;
  sfx: (name: Sfx) => void;
  playing: Scape | null;
};

const SoundContext = createContext<SoundState | null>(null);
const KEY = "dor-iran-sound";

export function SoundProvider({ children }: { children: React.ReactNode }) {
  // like the reference site's "SON ON": on by default; the browser still waits for a first click or key press
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState<Scape | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const current = useRef<{ voice: Voice; gain: GainNode } | null>(null);
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

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
    if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, []);

  /** Audio may only start after a user gesture; until then effects are skipped instead of queued. */
  const ready = () => Boolean(enabledRef.current && ctxRef.current && ctxRef.current.state === "running");

  const sfx = useCallback((name: Sfx) => {
    if (ready()) playSfx(ctxRef.current!, name);
  }, []);

  const stop = useCallback(() => {
    const c = current.current;
    if (!c || !ctxRef.current) return;
    const t = ctxRef.current.currentTime;
    c.gain.gain.cancelScheduledValues(t);
    c.gain.gain.setTargetAtTime(0, t, 0.25);
    window.setTimeout(() => c.voice.stop(), 900);
    current.current = null;
    setPlaying(null);
  }, []);

  const play = useCallback(
    (scape: Scape) => {
      if (!ready()) return;
      stop();
      const ac = ctxRef.current!;
      const gain = ac.createGain();
      gain.gain.value = 0;
      gain.connect(ac.destination);
      gain.gain.setTargetAtTime(0.45, ac.currentTime, 0.35);
      current.current = { voice: build(ac, scape, gain), gain };
      setPlaying(scape);
    },
    [stop],
  );

  const stamp = useCallback(() => {
    if (!ready()) return;
    const ac = ctxRef.current!;
    const t = ac.currentTime;
    // the thud of a rubber stamp: a short low sine knock plus a dull noise slap
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(og).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.2);
    const n = ac.createBufferSource();
    n.buffer = noiseBuffer(ac, "white", 0.1);
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.6, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.connect(lp).connect(ng).connect(ac.destination);
    n.start(t);
  }, []);

  // Site-wide, as on the reference page: every link/button ticks on hover and stamps on click.
  useEffect(() => {
    const unlock = () => {
      if (enabledRef.current) ctx();
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
  }, [ctx, sfx]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !on;
      try {
        localStorage.setItem(KEY, next ? "on" : "off");
      } catch {
        /* not persisted */
      }
      if (!next) stop();
      else ctx(); // unlock audio inside the click gesture
      return next;
    });
  }, [stop, ctx]);

  return (
    <SoundContext.Provider value={{ enabled, toggle, play, stop, stamp, sfx, playing }}>{children}</SoundContext.Provider>
  );
}

export function useSound() {
  const s = useContext(SoundContext);
  if (!s) throw new Error("useSound outside SoundProvider");
  return s;
}
