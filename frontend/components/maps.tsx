"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Leaflet touches `window` on import, so the maps load only in the browser.
const loading = () => <Skeleton className="size-full rounded-none" />;
export const StayMap = dynamic(() => import("@/components/stay-map").then((m) => m.StayMap), { ssr: false, loading });
export const StaysMap = dynamic(() => import("@/components/stay-map").then((m) => m.StaysMap), { ssr: false, loading });
