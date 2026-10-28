import type { DiscoveryFilterChange } from "@/modules/discovery/searchTypes";

// FILTERS
export const discoveryIntentFilters = (
  query: string,
): DiscoveryFilterChange => ({
  q: query,
  category_id: "",
  service_id: "",
  professional_id: "",
  resource_id: "",
  resource_type: "",
  sport_type: "",
  surface: "",
  covered: "",
  booking_model: "",
  duration_minutes: "",
  participants: "",
  page: "1",
});
