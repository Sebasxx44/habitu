import type {
  DiscoveryFilterChange,
  DiscoveryFilters,
} from "@/modules/discovery/searchTypes";

// HELPERS
export const categoryFilterChange = (
  categoryId: string,
  filters: DiscoveryFilters,
): DiscoveryFilterChange => ({
  category_id: categoryId,
  available:
    filters.duration_minutes &&
    !filters.date &&
    !filters.date_to &&
    !filters.time_from &&
    !filters.time_to
      ? ""
      : filters.available,
  service_id: "",
  professional_id: "",
  resource_id: "",
  resource_type: "",
  participants: "",
  duration_minutes: "",
  booking_model: "",
  sport_type: "",
  surface: "",
  covered: "",
});
