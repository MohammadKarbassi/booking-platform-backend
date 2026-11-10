"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CityPicker, DatesPicker, GuestsPicker, type Dates } from "@/components/search-fields";
import { cn } from "@/lib/utils";

export type SearchValue = { city_id?: number; guests: number } & Dates;

export function toQuery(v: Partial<SearchValue> & Record<string, unknown>) {
  const qs = new URLSearchParams();
  for (const [k, val] of Object.entries(v)) {
    if (val === undefined || val === null || val === "") continue;
    if (Array.isArray(val)) val.forEach((x) => qs.append(k, String(x)));
    else qs.set(k, String(val));
  }
  return qs.toString();
}

/** The travel-journal search bar: destination، dates، travellers → /stays */
export function SearchBar({ initial, className }: { initial?: Partial<SearchValue>; className?: string }) {
  const router = useRouter();
  const [v, setV] = useState<SearchValue>({ guests: 2, ...initial });

  return (
    <form
      role="search"
      aria-label="جست‌وجوی اقامتگاه"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/stays?${toQuery(v)}`);
      }}
      className={cn(
        "journal grid grid-cols-1 items-center gap-1 p-2 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.4fr_0.9fr_auto]",
        className,
      )}
    >
      <CityPicker value={v.city_id} onChange={(city_id) => setV((s) => ({ ...s, city_id }))} />
      <DatesPicker
        value={v}
        onChange={(d) => setV((s) => ({ ...s, ...d }))}
        className="lg:border-x lg:border-dashed lg:border-ink/25 lg:rounded-none"
      />
      <GuestsPicker value={v.guests} onChange={(guests) => setV((s) => ({ ...s, guests }))} />
      <Button
        type="submit"
        size="lg"
        className="h-12 gap-2 rounded-xl bg-lapis px-6 text-base font-bold sm:col-span-2 lg:col-span-1"
      >
        <Search className="size-5" />
        بگرد
      </Button>
    </form>
  );
}
