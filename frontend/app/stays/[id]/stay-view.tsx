"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BedDouble,
  Bath,
  Clock,
  Compass,
  DoorOpen,
  Map as MapIcon,
  MapPin,
  Ruler,
  ScrollText,
  Star,
  Users,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { CalendarDayButton } from "@/components/ui/calendar";
import { JalaliCalendar } from "@/components/jalali-calendar";
import { DiscoveryRadar, PoiList } from "@/components/discovery-radar";
import { FavoriteButton } from "@/components/favorite-button";
import { StayMap } from "@/components/maps";
import { Postmark } from "@/components/postmark";
import { BookingCard } from "./booking-card";
import { destinationPhotoLabel } from "@/lib/destination-photos";
import { clock, fa, isoDate, jDate, parseDate, today, tomanShort } from "@/lib/format";
import { amenityIcon } from "@/lib/icons";
import { useCalendar, useNearby, useReviews, useStay } from "@/lib/queries";
import type { CalendarDay, StayDetail } from "@/lib/types";

function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${fa(value)} از ۵ ستاره`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-saffron text-saffron" : "text-ink/20"}`} />
      ))}
    </span>
  );
}

function Gallery({ stay }: { stay: StayDetail }) {
  const images = stay.images.map((image) => ({ ...image, destination: destinationPhotoLabel(image.url) }));
  const propertyPhotos = images.filter((image) => !image.destination);
  const destinationPhotos = images.filter((image) => image.destination);
  const gallery = [
    ...propertyPhotos.sort((a, b) => Number(b.is_cover) - Number(a.is_cover)),
    ...destinationPhotos,
  ];

  return (
    <div className="relative -rotate-[0.6deg] rounded-[6px] bg-white p-3 pb-4 shadow-[0_24px_44px_-20px_rgb(23_32_61/0.55)] ring-1 ring-ink/10">
      {gallery.length > 0 && (
        <Carousel opts={{ direction: "rtl", loop: true }} dir="rtl" aria-label="گالری اقامتگاه و مقصد">
          <CarouselContent>
            {gallery.map((img, i) => (
              <CarouselItem key={img.url}>
                <figure className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.destination ?? `${stay.title}، عکس ${fa(i + 1)}`}
                    className="aspect-[16/10] w-full rounded-[3px] object-cover"
                  />
                  {img.destination && (
                    <figcaption className="absolute start-2 bottom-2 rounded bg-ink px-2 py-1 text-xs text-white">
                      عکس مقصد · {img.destination}
                    </figcaption>
                  )}
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
          {gallery.length > 1 && (
            <>
              <CarouselPrevious className="right-3 left-auto border-ink bg-white/90" />
              <CarouselNext className="right-auto left-3 border-ink bg-white/90" />
            </>
          )}
        </Carousel>
      )}
      {propertyPhotos.length === 0 && (
        <p className="px-2 pt-3 text-sm text-muted-foreground">هنوز عکسی از خود اقامتگاه ثبت نشده است.</p>
      )}
      <Postmark city={stay.city} className="absolute -bottom-6 left-6 w-40" />
    </div>
  );
}

function AvailabilityCalendar({ stayId }: { stayId: number }) {
  const start = isoDate(today());
  const cal = useCalendar(stayId, start, 90);
  const byDate = useMemo(() => new Map((cal.data ?? []).map((d) => [d.date, d] as [string, CalendarDay])), [cal.data]);
  const booked = (cal.data ?? []).filter((d) => !d.available).map((d) => parseDate(d.date));
  if (cal.isLoading) return <Skeleton className="h-80 w-full" />;
  return (
    <div className="overflow-x-auto">
      <JalaliCalendar
        numberOfMonths={2}
        disabled={(d) => d < today() || !byDate.has(isoDate(d))}
        modifiers={{ booked }}
        modifiersClassNames={{ booked: "[&>button]:line-through [&>button]:decoration-anar [&>button]:decoration-2 [&>button]:opacity-60" }}
        className="mx-auto bg-transparent [--cell-size:--spacing(12)]"
        components={{
          DayButton: ({ children, day, ...props }) => {
            const info = byDate.get(isoDate(day.date));
            return (
              <CalendarDayButton day={day} {...props}>
                {children}
                {info && info.available && (
                  <span className="!text-[9px] !opacity-100 font-bold text-firoozeh">{tomanShort(info.price).replace(" میلیون", "م")}</span>
                )}
              </CalendarDayButton>
            );
          },
        }}
      />
      <p className="mt-2 text-center text-xs text-muted-foreground">
        عدد زیر هر روز، نرخ پایه یا نرخ تعیین‌شده برای آن روز است. مبلغ نهایی بعد از انتخاب تاریخ و تعداد مسافر مشخص می‌شود. روزهای خط‌خورده در دسترس نیستند.
      </p>
    </div>
  );
}

export function StayView({ id }: { id: number }) {
  const sp = useSearchParams();
  const stay = useStay(id);
  const nearby = useNearby(id, 40);
  const reviews = useReviews(id);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (stay.data) document.title = `${stay.data.title} | دور ایران`;
  }, [stay.data]);

  if (stay.isLoading)
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="aspect-[16/7] w-full" />
      </div>
    );
  if (stay.isError || !stay.data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <Empty className="journal">
          <EmptyHeader>
            <EmptyTitle className="text-display text-3xl">این کارت‌پستال گم شده</EmptyTitle>
            <EmptyDescription>{stay.error?.message ?? "اقامتگاه پیدا نشد."}</EmptyDescription>
          </EmptyHeader>
          <Button asChild className="bg-lapis">
            <Link href="/stays">برگرد به همهٔ اقامتگاه‌ها</Link>
          </Button>
        </Empty>
      </div>
    );

  const s = stay.data;
  const facts = [
    { icon: Users, text: `${fa(s.base_capacity)} نفر، تا ${fa(s.max_capacity)} نفر` },
    { icon: DoorOpen, text: `${fa(s.bedrooms)} اتاق خواب` },
    { icon: BedDouble, text: `${fa(s.beds)} تخت` },
    { icon: Bath, text: `${fa(s.bathrooms)} سرویس` },
    ...(s.area_m2 ? [{ icon: Ruler, text: `${fa(s.area_m2)} متر` }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-24 lg:pb-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">خانه</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="rotate-180" />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/stays">اقامتگاه‌ها</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="rotate-180" />
          <BreadcrumbItem>
            <BreadcrumbPage>{s.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display text-4xl text-ink sm:text-6xl">{s.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-4 text-anar" /> {s.city}، {s.province}
            </span>
            <span aria-hidden>•</span>
            <span>{s.type}</span>
            {s.rating.count > 0 && (
              <>
                <span aria-hidden>•</span>
                <span className="flex items-center gap-1.5 font-semibold text-ink">
                  <Stars value={s.rating.average ?? 0} size="size-3.5" />
                  {fa(s.rating.average ?? 0, { maximumFractionDigits: 1 })} از {fa(s.rating.count)} نظر
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton stayId={s.id} className="size-10" />
        </div>
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <Gallery stay={s} />

          <ul className="mt-14 flex flex-wrap gap-2.5">
            {facts.map((f) => (
              <li key={f.text} className="flex items-center gap-2 rounded-full border-[1.5px] border-ink/25 bg-card px-3.5 py-1.5 text-sm font-semibold">
                <f.icon className="size-4 text-lapis" /> {f.text}
              </li>
            ))}
          </ul>

          {s.description && <p className="mt-6 text-lg leading-9 text-ink/85">{s.description}</p>}

          {/* discovery */}
          <section className="mt-14" aria-labelledby="around">
            <p className="text-sm font-bold text-anar">قطب‌نمای کشف</p>
            <h2 id="around" className="text-display mt-1 text-4xl text-ink">
              دور و بر {s.title}
            </h2>
            <Tabs defaultValue="compass" className="mt-5">
              <TabsList className="rounded-full border-[1.5px] border-ink bg-card p-1">
                <TabsTrigger value="compass" className="gap-1.5 rounded-full px-4 data-[state=active]:bg-ink data-[state=active]:text-paper">
                  <Compass className="size-4" /> قطب‌نما
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-1.5 rounded-full px-4 data-[state=active]:bg-ink data-[state=active]:text-paper">
                  <MapIcon className="size-4" /> نقشه
                </TabsTrigger>
              </TabsList>
              {nearby.isLoading ? (
                <Skeleton className="mt-4 h-96 w-full" />
              ) : !nearby.data?.length ? (
                <p className="mt-4 rounded-xl border border-dashed p-6 text-muted-foreground">
                  هنوز جاذبه‌ای در نزدیکی این اقامتگاه ثبت نشده. خودت کاشفش باش!
                </p>
              ) : (
                <>
                  <TabsContent value="compass" className="mt-4">
                    <div className="journal grid items-center gap-4 p-4 md:grid-cols-[1.1fr_1fr]">
                      <DiscoveryRadar
                        center={{ lat: s.latitude, lng: s.longitude, label: s.title }}
                        pois={nearby.data}
                        activeId={active}
                        onActive={setActive}
                      />
                      <div className="max-h-[400px] overflow-auto">
                        <PoiList pois={nearby.data} activeId={active} onActive={setActive} />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="map" className="mt-4">
                    <div className="journal grid overflow-hidden md:grid-cols-[1.4fr_1fr]">
                      <div className="h-[420px]">
                        <StayMap center={{ lat: s.latitude, lng: s.longitude, label: s.title }} pois={nearby.data} activeId={active} />
                      </div>
                      <div className="max-h-[420px] overflow-auto border-t-2 border-ink p-3 md:border-t-0 md:border-r-2">
                        <PoiList pois={nearby.data} activeId={active} onActive={setActive} />
                      </div>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-4" /> {s.address}
                    </p>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </section>

          <section className="mt-14" aria-labelledby="amenities">
            <h2 id="amenities" className="text-display text-3xl text-ink">امکانات</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {s.amenities.map((a) => {
                const Icon = amenityIcon(a.icon);
                return (
                  <li key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 font-semibold">
                    <Icon className="size-5 text-lapis" /> {a.name}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-14 grid gap-4 sm:grid-cols-2" aria-label="میزبان و قوانین">
            <div className="journal-sm flex items-center gap-4 p-4">
              <Avatar className="size-14 border-2 border-ink">
                <AvatarFallback className="bg-saffron text-xl font-bold text-ink">{s.host.full_name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">میزبان تو</p>
                <p className="text-lg font-bold">{s.host.full_name}</p>
              </div>
            </div>
            <div className="journal-sm space-y-2 p-4 text-sm">
              <p className="flex items-center gap-2">
                <Clock className="size-4 text-lapis" /> ورود از ساعت {clock(s.check_in_time)}، خروج تا {clock(s.check_out_time)}
              </p>
              {s.house_rules && (
                <p className="flex items-center gap-2">
                  <ScrollText className="size-4 text-lapis" /> {s.house_rules}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Compass className="size-4 text-lapis" /> حداقل {fa(s.min_nights)} شب اقامت
              </p>
            </div>
          </section>

          <section className="mt-14" aria-labelledby="calendar">
            <h2 id="calendar" className="text-display text-3xl text-ink">تقویم و نرخ‌های سه ماه آینده</h2>
            <div className="journal mt-4 p-4">
              <AvailabilityCalendar stayId={s.id} />
            </div>
          </section>

          <section className="mt-14" aria-labelledby="reviews">
            <h2 id="reviews" className="text-display text-3xl text-ink">
              مسافرها چه گفتند {reviews.data?.length ? `(${fa(reviews.data.length)})` : ""}
            </h2>
            {reviews.isLoading ? (
              <Skeleton className="mt-4 h-32" />
            ) : !reviews.data?.length ? (
              <p className="mt-4 rounded-xl border border-dashed p-6 text-muted-foreground">
                هنوز کسی از این‌جا ننوشته. اولین سفرنامه را تو بنویس.
              </p>
            ) : (
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {reviews.data.map((r) => (
                  <li key={r.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{r.guest ?? "مسافر"}</span>
                      <Stars value={r.rating} size="size-3.5" />
                    </div>
                    {r.comment && <p className="mt-2 leading-7">{r.comment}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">{jDate(r.created_at.slice(0, 10))}</p>
                    {r.admin_reply && (
                      <p className="mt-3 rounded-lg bg-muted p-3 text-sm">
                        <span className="font-bold">پاسخ دور ایران: </span>
                        {r.admin_reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside id="booking" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start" aria-label="رزرو">
          <BookingCard
            stay={s}
            initial={{
              check_in: sp.get("check_in") ?? undefined,
              check_out: sp.get("check_out") ?? undefined,
              guests: sp.get("guests") ? Number(sp.get("guests")) : undefined,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
