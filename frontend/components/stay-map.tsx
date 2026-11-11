"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { categoryStyle } from "@/components/discovery-radar";
import { tomanShort } from "@/lib/format";
import type { Poi, StayCard } from "@/lib/types";

const pin = (bg: string, size = 18, ring = "#fff") =>
  L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:3px solid ${ring};box-shadow:0 2px 6px rgb(0 0 0/.35)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const pricePin = (s: StayCard) =>
  L.divIcon({
    className: "",
    html: `<a href="/stays/${s.id}" style="display:inline-block;white-space:nowrap;font:700 12px var(--font-vazir),sans-serif;background:#fbfcf9;color:#17203d;border:2px solid #17203d;border-radius:999px;padding:3px 9px;box-shadow:-3px 3px 0 #17203d;text-decoration:none">${s.city}، ${tomanShort(s.base_price_per_night)}</a>`,
    iconSize: [0, 0],
    iconAnchor: [40, 14],
  });

/*
  No animated zooms: these maps are rebuilt whenever the place changes, and Leaflet crashes
  ("Cannot read properties of undefined (reading '_leaflet_pos')") if a map is removed while a zoom
  transition is still running. Instant zooms leave nothing pending when the map goes away.
*/
const MAP_OPTIONS: L.MapOptions = {
  scrollWheelZoom: false,
  zoomAnimation: false,
  fadeAnimation: false,
  markerZoomAnimation: false,
};

function tiles(map: L.Map) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);
}

/** Map of one stay and the attractions around it. */
export function StayMap({
  center,
  pois,
  activeId,
}: {
  center: { lat: number; lng: number; label: string };
  pois: Poi[];
  activeId?: number | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<number, L.Marker>>(new Map());

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, MAP_OPTIONS).setView([center.lat, center.lng], 13, { animate: false });
    tiles(m);
    L.marker([center.lat, center.lng], { icon: pin("#f2b01e", 26, "#17203d") }).addTo(m).bindTooltip(center.label);
    pois.forEach((p) => {
      const mk = L.marker([p.latitude, p.longitude], { icon: pin(categoryStyle(p.category).color) })
        .addTo(m)
        .bindTooltip(p.name);
      markers.current.set(p.id, mk);
    });
    if (pois.length) {
      m.fitBounds(L.latLngBounds([[center.lat, center.lng], ...pois.map((p) => [p.latitude, p.longitude] as [number, number])]), {
        padding: [30, 30],
        maxZoom: 14,
        animate: false,
      });
    }
    map.current = m;
    const mk = markers.current;
    return () => {
      m.remove();
      mk.clear();
    };
    // rebuild only when the place or the set of pins really changes, not when a parent passes a new array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, center.label, pois.map((p) => p.id).join(",")]);

  useEffect(() => {
    markers.current.forEach((mk, id) => (id === activeId ? mk.openTooltip() : mk.closeTooltip()));
  }, [activeId]);

  return <div ref={el} className="size-full" />;
}

/** Overview map with a price pin for every stay. */
export function StaysMap({ stays }: { stays: StayCard[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, MAP_OPTIONS).setView([32.4, 53.7], 5, { animate: false });
    tiles(m);
    stays.forEach((s) => L.marker([s.latitude, s.longitude], { icon: pricePin(s) }).addTo(m));
    if (stays.length > 1) m.fitBounds(L.latLngBounds(stays.map((s) => [s.latitude, s.longitude] as [number, number])), { padding: [40, 40], animate: false });
    else if (stays.length === 1) m.setView([stays[0].latitude, stays[0].longitude], 11, { animate: false });
    return () => {
      m.remove();
    };
  }, [stays]);
  return <div ref={el} className="size-full" />;
}
