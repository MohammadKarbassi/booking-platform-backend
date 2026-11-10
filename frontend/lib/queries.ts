"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Amenity,
  CalendarDay,
  City,
  Poi,
  PoiCategory,
  Province,
  Quote,
  Review,
  SearchResult,
  StayDetail,
  StayType,
} from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export const useCities = () =>
  useQuery({ queryKey: ["cities"], queryFn: () => api<City[]>("/catalog/cities"), staleTime: DAY });
export const useProvinces = () =>
  useQuery({ queryKey: ["provinces"], queryFn: () => api<Province[]>("/catalog/provinces"), staleTime: DAY });
export const useTypes = () =>
  useQuery({ queryKey: ["types"], queryFn: () => api<StayType[]>("/catalog/accommodation-types"), staleTime: DAY });
export const useAmenities = () =>
  useQuery({ queryKey: ["amenities"], queryFn: () => api<Amenity[]>("/catalog/amenities"), staleTime: DAY });
export const usePoiCategories = () =>
  useQuery({ queryKey: ["poi-categories"], queryFn: () => api<PoiCategory[]>("/catalog/poi-categories"), staleTime: DAY });

export type SearchParams = {
  city_id?: number;
  province_id?: number;
  type_id?: number;
  check_in?: string;
  check_out?: string;
  guests?: number;
  amenity_ids?: number[];
  min_price?: number;
  max_price?: number;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  size?: number;
};

export const useSearch = (p: SearchParams) =>
  useQuery({
    queryKey: ["search", p],
    queryFn: () => api<SearchResult>("/accommodations", { query: p }),
    placeholderData: (prev) => prev,
  });

export const useStay = (id: number) =>
  useQuery({ queryKey: ["stay", id], queryFn: () => api<StayDetail>(`/accommodations/${id}`) });

export const useNearby = (id: number, radius = 40) =>
  useQuery({
    queryKey: ["nearby", id, radius],
    queryFn: () => api<Poi[]>(`/accommodations/${id}/nearby`, { query: { radius_km: radius } }),
  });

export const useReviews = (id: number) =>
  useQuery({ queryKey: ["reviews", id], queryFn: () => api<Review[]>(`/accommodations/${id}/reviews`) });

export const useCalendar = (id: number, start: string, days = 90) =>
  useQuery({
    queryKey: ["calendar", id, start, days],
    queryFn: () => api<CalendarDay[]>(`/accommodations/${id}/calendar`, { query: { start, days } }),
  });

export const useQuote = (id: number, check_in?: string, check_out?: string, guests = 1) =>
  useQuery({
    queryKey: ["quote", id, check_in, check_out, guests],
    queryFn: () => api<Quote>(`/accommodations/${id}/quote`, { query: { check_in, check_out, guests } }),
    enabled: Boolean(check_in && check_out),
    retry: false,
  });
