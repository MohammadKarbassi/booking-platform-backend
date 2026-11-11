"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Map as MapIcon, MapPin, SearchX, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { SearchBar, toQuery } from "@/components/search-bar";
import { StayPostcard, StayPostcardSkeleton } from "@/components/stay-postcard";
import { StaysMap } from "@/components/maps";
import { fa, toman } from "@/lib/format";
import { useAmenities, useCities, useLandmarks, useSearch, useTypes, type SearchParams } from "@/lib/queries";

const PAGE_SIZE = 9;
const PRICE_MAX = 500_000_000; // Rial (50 million Toman)

function readParams(sp: URLSearchParams): SearchParams & { view?: string } {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    city_id: num("city_id"),
    province_id: num("province_id"),
    type_id: num("type_id"),
    check_in: sp.get("check_in") ?? undefined,
    check_out: sp.get("check_out") ?? undefined,
    guests: num("guests"),
    amenity_ids: sp.getAll("amenity_ids").map(Number),
    min_price: num("min_price"),
    max_price: num("max_price"),
    q: sp.get("q") ?? undefined,
    near_poi_id: num("near_poi_id"),
    radius_km: num("radius_km"),
    sort: (sp.get("sort") as SearchParams["sort"]) ?? (sp.get("near_poi_id") ? "distance" : "newest"),
    page: num("page") ?? 1,
    view: sp.get("view") ?? "cards",
  };
}

function FiltersSheet({ p, apply }: { p: SearchParams; apply: (patch: Partial<SearchParams>) => void }) {
  const amenities = useAmenities();
  const [ids, setIds] = useState<number[]>(p.amenity_ids ?? []);
  const [price, setPrice] = useState<[number, number]>([p.min_price ?? 0, p.max_price ?? PRICE_MAX]);
  const [q, setQ] = useState(p.q ?? "");
  const count = (p.amenity_ids?.length ?? 0) + (p.min_price || p.max_price ? 1 : 0) + (p.q ? 1 : 0);

  return (
    <Sheet
      onOpenChange={(open) => {
        if (open) {
          setIds(p.amenity_ids ?? []);
          setPrice([p.min_price ?? 0, p.max_price ?? PRICE_MAX]);
          setQ(p.q ?? "");
        }
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="journal-sm journal-press gap-2 rounded-full font-bold">
          <SlidersHorizontal className="size-4" />
          فیلترها
          {count > 0 && <Badge className="h-5 min-w-5 rounded-full bg-anar px-1.5">{fa(count)}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full bg-paper sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-display text-3xl">فیلترها</SheetTitle>
          <SheetDescription>هرچه دقیق‌تر بگویی، کارت‌پستال‌های کمتری اما بهتری می‌بینی.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-7 overflow-y-auto px-4">
          <div className="space-y-2">
            <Label htmlFor="q">نام اقامتگاه</Label>
            <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً کلبه" />
          </div>
          <div className="space-y-4">
            <Label>قیمت هر شب</Label>
            <Slider
              min={0}
              max={PRICE_MAX}
              step={10_000_000}
              value={price}
              onValueChange={(v) => setPrice([v[0], v[1]])}
              aria-label="بازهٔ قیمت"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{toman(price[0])}</span>
              <span>{price[1] >= PRICE_MAX ? "بدون سقف" : toman(price[1])}</span>
            </div>
          </div>
          <Separator />
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-semibold">امکانات لازم</legend>
            <div className="grid grid-cols-2 gap-3">
              {amenities.data?.map((a) => (
                <Label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-3 font-normal has-[[data-state=checked]]:border-lapis has-[[data-state=checked]]:bg-lapis/5">
                  <Checkbox
                    checked={ids.includes(a.id)}
                    onCheckedChange={(c) => setIds((s) => (c ? [...s, a.id] : s.filter((x) => x !== a.id)))}
                  />
                  {a.name}
                </Label>
              ))}
            </div>
          </fieldset>
        </div>
        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button
              className="flex-1 bg-lapis font-bold"
              onClick={() =>
                apply({
                  amenity_ids: ids,
                  min_price: price[0] || undefined,
                  max_price: price[1] < PRICE_MAX ? price[1] : undefined,
                  q: q.trim() || undefined,
                })
              }
            >
              نمایش نتیجه‌ها
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="outline" onClick={() => apply({ amenity_ids: [], min_price: undefined, max_price: undefined, q: undefined })}>
              پاک کردن فیلترها
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function StaysExplorer() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const p = readParams(sp);
  const { view, ...search } = p;
  const res = useSearch({ ...search, size: PAGE_SIZE });
  const types = useTypes();
  const cities = useCities();
  const city = cities.data?.find((c) => c.id === p.city_id);
  const landmarks = useLandmarks(p.radius_km ?? 40);
  const landmark = landmarks.data?.find((l) => l.id === p.near_poi_id);

  const apply = (patch: Partial<SearchParams> & { view?: string }) => {
    const next = { ...p, page: 1, ...patch };
    router.push(`${pathname}?${toQuery(next as Record<string, unknown>)}`, { scroll: false });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [p.page]);

  const total = res.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const stayQuery = `?${toQuery({ check_in: p.check_in, check_out: p.check_out, guests: p.guests })}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SearchBar
        key={sp.toString()}
        initial={{ city_id: p.city_id, check_in: p.check_in, check_out: p.check_out, guests: p.guests ?? 2 }}
      />

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display text-4xl text-ink sm:text-5xl">
            {landmark ? `نزدیک ${landmark.name}` : city ? `اقامتگاه‌های ${city.name}` : "همهٔ اقامتگاه‌ها"}
          </h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite">
            {res.isLoading ? "در حال گشتن…" : `${fa(total)} اقامتگاه پیدا شد`}
            {p.check_in && p.check_out && "، فقط آن‌هایی که در این تاریخ آزادند"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiltersSheet p={p} apply={apply} />
          <Select value={p.sort} onValueChange={(sort) => apply({ sort: sort as SearchParams["sort"] })}>
            <SelectTrigger className="w-40 rounded-full border-ink bg-card" aria-label="مرتب‌سازی">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">تازه‌ترین</SelectItem>
              <SelectItem value="price_asc">ارزان‌ترین</SelectItem>
              <SelectItem value="price_desc">گران‌ترین</SelectItem>
              {p.near_poi_id && <SelectItem value="distance">نزدیک‌ترین</SelectItem>}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            variant="outline"
            value={view}
            onValueChange={(v) => v && apply({ view: v, page: p.page })}
            aria-label="نوع نمایش"
            className="rounded-full bg-card"
          >
            <ToggleGroupItem value="cards" aria-label="کارت‌پستال" className="gap-1.5 px-3">
              <LayoutGrid className="size-4" /> کارت
            </ToggleGroupItem>
            <ToggleGroupItem value="map" aria-label="نقشه" className="gap-1.5 px-3">
              <MapIcon className="size-4" /> نقشه
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {p.near_poi_id && (
        <div className="journal-sm mt-5 flex flex-wrap items-center gap-3 p-3">
          <MapPin className="size-5 text-anar" />
          <span>
            فقط اقامتگاه‌های تا {fa(p.radius_km ?? 40)} کیلومتری <strong>{landmark?.name ?? "این جاذبه"}</strong>
            {landmark && `، ${landmark.city}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => apply({ near_poi_id: undefined, radius_km: undefined, sort: "newest" })}
          >
            <X /> برداشتن
          </Button>
        </div>
      )}

      {/* type chips */}
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="نوع اقامتگاه">
        {[{ id: undefined, name: "همه" }, ...(types.data ?? [])].map((t) => {
          const on = p.type_id === t.id;
          return (
            <button
              key={t.name}
              type="button"
              aria-pressed={on}
              onClick={() => apply({ type_id: t.id })}
              className={`rounded-full border-[1.5px] px-4 py-1.5 text-sm font-semibold transition ${
                on ? "border-ink bg-ink text-paper" : "border-ink/30 bg-card hover:border-ink"
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <div className="mt-10">
        {res.isError ? (
          <Empty className="journal">
            <EmptyHeader>
              <EmptyTitle>نتیجه‌ها نیامد</EmptyTitle>
              <EmptyDescription>{(res.error as Error).message}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => res.refetch()}>دوباره امتحان کن</Button>
            </EmptyContent>
          </Empty>
        ) : !res.isLoading && total === 0 ? (
          <Empty className="journal py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle className="text-display text-3xl">این‌جا چیزی پیدا نکردیم</EmptyTitle>
              <EmptyDescription>
                شاید همه رزرو شده‌اند یا فیلترها سخت‌گیرند. تاریخ را جابه‌جا کن یا فیلترها را بردار.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.push("/stays")} className="bg-lapis">
                همهٔ اقامتگاه‌ها را نشانم بده
              </Button>
            </EmptyContent>
          </Empty>
        ) : view === "map" ? (
          <div className="journal h-[620px] overflow-hidden">
            {res.data && <StaysMap stays={res.data.items} />}
          </div>
        ) : (
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {res.isLoading
              ? Array.from({ length: 6 }, (_, i) => <StayPostcardSkeleton key={i} />)
              : res.data?.items.map((s, i) => <StayPostcard key={s.id} stay={s} index={i} query={stayQuery} />)}
          </div>
        )}
      </div>

      {pages > 1 && (
        <Pagination className="mt-12">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="قبلی"
                aria-disabled={p.page === 1}
                className={p.page === 1 ? "pointer-events-none opacity-40" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  apply({ page: (p.page ?? 1) - 1 });
                }}
              />
            </PaginationItem>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <PaginationItem key={n}>
                <PaginationLink
                  href="#"
                  isActive={n === p.page}
                  onClick={(e) => {
                    e.preventDefault();
                    apply({ page: n });
                  }}
                >
                  {fa(n)}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                text="بعدی"
                aria-disabled={p.page === pages}
                className={p.page === pages ? "pointer-events-none opacity-40" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  apply({ page: (p.page ?? 1) + 1 });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
