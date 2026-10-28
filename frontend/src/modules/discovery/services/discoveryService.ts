import { httpService } from "@/services/auth/authService";
import type { BookingApiResponse } from "@/composables/booking/types";
import type {
  DiscoveryFilters,
  DiscoveryPage,
  DiscoverySuggestion,
} from "@/modules/discovery/searchTypes";
import { discoveryQuery } from "@/modules/discovery/query";

// SERVICES
export const discoveryService = {
  intent: async (query: string, locale: 'es' | 'en', signal: AbortSignal): Promise<Partial<Record<keyof DiscoveryFilters, string | number | boolean>>> => {
    const response = await httpService.get<BookingApiResponse<{ filters: Partial<Record<keyof DiscoveryFilters, string | number | boolean>> }>>('/v2/businesses/intent', { params: { q: query, locale }, signal });
    return response.data.filters;
  },
  search: async (
    filters: DiscoveryFilters,
    signal: AbortSignal,
  ): Promise<DiscoveryPage> => {
    const response = await httpService.get<BookingApiResponse<DiscoveryPage>>(
      `/v2/businesses/search?${discoveryQuery(filters)}`,
      { signal },
    );
    return response.data;
  },
  suggest: async (
    query: string,
    signal: AbortSignal,
  ): Promise<DiscoverySuggestion[]> => {
    const response = await httpService.get<
      BookingApiResponse<DiscoverySuggestion[]>
    >("/v2/businesses/suggestions", { params: { q: query }, signal });
    return response.data;
  },
};
