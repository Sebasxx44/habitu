import type { DiscoveryFilters } from "@/modules/discovery/searchTypes";
import { isExternalBooking } from "@/modules/businesses/booking";

// FILTERS
export const discoveryDefaults: DiscoveryFilters = {
  q: "",
  category_id: "",
  service_id: "",
  professional_id: "",
  zone: "",
  min_price: "",
  max_price: "",
  min_rating: "",
  date: "",
  date_to: "",
  time_from: "",
  time_to: "",
  available: "",
  promotions: "",
  sort: "recommended",
  lat: "",
  lng: "",
  radius: "10",
  page: "1",
  booking_model: "", duration_minutes: "", participants: "", resource_id: "", resource_type: "", sport_type: "", surface: "", covered: "",
};
export const readDiscoveryFilters = (
  params: URLSearchParams,
): DiscoveryFilters => {
  const values = { ...discoveryDefaults };
  for (const key of Object.keys(values) as (keyof DiscoveryFilters)[])
    values[key] = params.get(key) ?? values[key];
  if (!/^\d+$/.test(values.page) || Number(values.page) < 1) values.page = "1";
  return values;
};
export const discoveryQuery = (filters: DiscoveryFilters): URLSearchParams => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value) query.set(key, value);
  query.set("per_page", "12");
  if (!filters.lat || !filters.lng) {
    query.delete("lat");
    query.delete("lng");
    query.delete("radius");
  }
  return query;
};
export const discoveryDay = (offset = 0, clock = new Date(), timezone = "America/Bogota"): string => {
  const localDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(clock);
  const day = new Date(`${localDay}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
};
export const discoveryBookingLink = (
  business: {
    id: number;
    booking_mode?: 'internal' | 'external';
    next_available?: {
      service_id: number;
      branch_id: number;
      date: string;
      start_time: string;
      professional_id?: number;
      resource_id?: number;
      duration_minutes?: number;
      participants?: number;
    } | null;
  },
  serviceId?: number,
  source?: "marketplace" | "assistant" | "express",
): string => {
  if (isExternalBooking(business)) return `/cliente/business/${business.id}`;
  const params = new URLSearchParams({ book: "1" });
  if (source) params.set("source", source);
  if (serviceId) params.set("service_id", String(serviceId));
  const slot = business.next_available;
  if (slot && (!serviceId || serviceId === slot.service_id)) {
    params.set("service_id", String(slot.service_id));
    params.set("branch_id", String(slot.branch_id));
    params.set("date", slot.date);
    params.set("time", slot.start_time.slice(0, 5));
    if (slot.resource_id) params.set("resource_id", String(slot.resource_id));
    if (slot.duration_minutes) params.set("duration_minutes", String(slot.duration_minutes));
    if (slot.participants) params.set("participants", String(slot.participants));
    if (slot.professional_id)
      params.set("professional_id", String(slot.professional_id));
  }
  return `/cliente/business/${business.id}?${params}`;
};
