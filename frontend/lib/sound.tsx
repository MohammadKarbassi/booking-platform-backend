"use client";

/*
  Postcard soundscapes, synthesised live with the Web Audio API (no audio files to license or download).
  Off by default: browsers block autoplay, and surprise sound is bad UX. The header toggle turns it on.
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

type SoundState = {
  enabled: boolean;
  toggle: () => void;
  play: (scape: Scape) => void;
  stop: () => void;
  stamp: () => void;
  playing: Scape | null;
};

const SoundContext = createContext<SoundState | null>(null);
const KEY = "dor-iran-sound";

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState<Scape | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const current = useRef<{ voice: Voice; gain: GainNode } | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a per-viewer preference after hydration
      setEnabled(localStorage.getItem(KEY) === "on");
    } catch {
      /* storage blocked: stays off */
    }
  }, []);

  const ctx = () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  };

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
      if (!enabled) return;
      stop();
      const ac = ctx();
      const gain = ac.createGain();
      gain.gain.value = 0;
      gain.connect(ac.destination);
      gain.gain.setTargetAtTime(0.5, ac.currentTime, 0.35);
      current.current = { voice: build(ac, scape, gain), gain };
      setPlaying(scape);
    },
    [enabled, stop],
  );

  const stamp = useCallback(() => {
    if (!enabled) return;
    const ac = ctx();
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
  }, [enabled]);

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
  }, [stop]);

  return (
    <SoundContext.Provider value={{ enabled, toggle, play, stop, stamp, playing }}>{children}</SoundContext.Provider>
  );
}

export function useSound() {
  const s = useContext(SoundContext);
  if (!s) throw new Error("useSound outside SoundProvider");
  return s;
}
