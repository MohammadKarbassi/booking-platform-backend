"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AdminReview,
  Booking,
  BookingStatus,
  CalendarDay,
  Holiday,
  Host,
  PricingRule,
  ReviewStatus,
  StayCard,
  StayDetail,
} from "@/lib/types";

// Query keys shared by the admin pages so mutations can invalidate exactly what they changed.
export const adminKeys = {
  stays: ["admin", "stays"] as const,
  stay: (id: number) => ["admin", "stay", id] as const,
  rules: (id: number) => ["admin", "rules", id] as const,
  calendar: (id: number) => ["admin", "calendar", id] as const,
  hosts: ["admin", "hosts"] as const,
  holidays: ["admin", "holidays"] as const,
  bookings: ["admin", "bookings"] as const,
  reviews: ["admin", "reviews"] as const,
};

export const useAdminStays = () =>
  useQuery({ queryKey: adminKeys.stays, queryFn: () => api<StayCard[]>("/admin/accommodations") });

export const useAdminStay = (id: number) =>
  useQuery({
    queryKey: adminKeys.stay(id),
    queryFn: () => api<StayDetail>(`/admin/accommodations/${id}`),
    enabled: Number.isFinite(id),
  });

export const usePricingRules = (id: number) =>
  useQuery({
    queryKey: adminKeys.rules(id),
    queryFn: () => api<PricingRule[]>(`/admin/accommodations/${id}/pricing-rules`),
  });

/** Public calendar: only answers for active stays (404 otherwise). */
export const useStayCalendar = (id: number, start: string, enabled: boolean) =>
  useQuery({
    queryKey: [...adminKeys.calendar(id), start],
    queryFn: () => api<CalendarDay[]>(`/accommodations/${id}/calendar`, { query: { start, days: 60 } }),
    enabled,
    retry: false,
  });

export const useHosts = () => useQuery({ queryKey: adminKeys.hosts, queryFn: () => api<Host[]>("/admin/hosts") });

export const useHolidays = () =>
  useQuery({ queryKey: adminKeys.holidays, queryFn: () => api<Holiday[]>("/admin/holidays") });

export const useAdminBookings = (status?: BookingStatus) =>
  useQuery({
    queryKey: [...adminKeys.bookings, status ?? "all"],
    queryFn: () => api<Booking[]>("/admin/bookings", { query: { status } }),
  });

export const useAdminReviews = (status: ReviewStatus) =>
  useQuery({
    queryKey: [...adminKeys.reviews, status],
    queryFn: () => api<AdminReview[]>("/admin/reviews", { query: { status } }),
  });
