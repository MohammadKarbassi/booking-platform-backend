"use client";

/*
  Floating "travel journal" bar at the bottom of the home deck, after the reference page's
  «CARNETS DE VOYAGE» bar: a book icon, a two-weight label and a menu icon; opening it unfolds a panel
  upward with search and the main destinations, with a swish in and out.
*/

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Compass, Heart, Map, NotebookPen, Volume2, VolumeX, X, AlignLeft } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { useAuth } from "@/lib/auth";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/stays", icon: Compass, bold: "کشف", light: "اقامتگاه‌ها" },
  { href: "/stays?view=map", icon: Map, bold: "نقشهٔ", light: "ایران" },
  { href: "/trips", icon: NotebookPen, bold: "سفرنامهٔ", light: "من", auth: true },
  { href: "/favorites", icon: Heart, bold: "نشان‌", light: "شده‌ها", auth: true },
];

export function JournalBar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const sound = useSound();
  const panel = useRef<HTMLDivElement>(null);

  const toggle = (next: boolean) => {
    setOpen(next);
    sound.sfx(next ? "menuIn" : "menuOut");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && toggle(false);
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("button, a")?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[450] flex justify-center px-4">
      <div className="pointer-events-auto relative w-full max-w-[660px]">
        {/* the second sheet peeking out underneath, like a notebook */}
        <div aria-hidden className="absolute inset-0 translate-x-[-10px] translate-y-[10px] rounded-xl border-2 border-ink/80 bg-card" />
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border-2 border-ink bg-card transition-[max-height] duration-500 ease-[cubic-bezier(.7,0,.2,1)]",
            open ? "max-h-[85svh]" : "max-h-[76px]",
          )}
        >
          <div
            ref={panel}
            id="journal-panel"
            hidden={!open}
            className="max-h-[calc(85svh-76px)] overflow-y-auto border-b-2 border-dashed border-ink/30 p-5"
          >
            <ul className="grid gap-1 sm:grid-cols-2">
              {LINKS.filter((l) => !l.auth || user).map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xl transition-colors hover:bg-ink/5"
                  >
                    <l.icon className="size-6 text-lapis" />
                    <span className="text-display">{l.bold}</span>
                    <span className="-ms-1.5 font-light">{l.light}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-2 text-sm font-bold text-muted-foreground">جست‌وجوی مقصد</p>
            <SearchBar className="shadow-none" />
            <button
              type="button"
              onClick={sound.toggle}
              aria-pressed={sound.enabled}
              className="mt-4 flex items-center gap-2 rounded-full border border-ink/30 px-3 py-1.5 text-sm font-semibold"
            >
              {sound.enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              صدا {sound.enabled ? "روشن" : "خاموش"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => toggle(!open)}
            aria-expanded={open}
            aria-controls="journal-panel"
            className="flex h-[72px] w-full items-center gap-4 px-5 text-start"
          >
            <BookOpen className="size-9 shrink-0 stroke-[1.4]" aria-hidden />
            <span className="text-2xl sm:text-3xl">
              <span className="text-display">سفرنامهٔ</span> <span className="font-light">دور ایران</span>
            </span>
            <span className="sr-only">{open ? "بستن منو" : "باز کردن منو و جست‌وجو"}</span>
            <span className="ms-auto">{open ? <X className="size-8 stroke-[1.4]" /> : <AlignLeft className="size-8 stroke-[1.4]" />}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
