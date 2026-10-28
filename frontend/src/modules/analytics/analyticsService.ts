import { httpService } from "@/services/auth/authService";
import { analyticsQuery } from "@/modules/analytics/period";
import type {
  AnalyticsFilters,
  AnalyticsOverview,
} from "@/modules/analytics/types";

// SERVICE
export const analyticsService = {
  overview: (
    businessId: number | null,
    filters: AnalyticsFilters,
    signal: AbortSignal,
  ): Promise<AnalyticsOverview> =>
    httpService.get(
      `/analytics/${businessId === null ? "platform" : `businesses/${businessId}`}?${analyticsQuery(filters)}`,
      { signal },
    ),
};
