import { httpService } from "@/services/auth/authService";
import { analyticsQuery } from "@/modules/analytics/period";
import type { AnalyticsFilters } from "@/modules/analytics/types";
import type {
  AnalyticsEnvironment,
  HealthBusiness,
  HealthOverview,
  HealthSegments,
  HealthFeatureChange,
  HealthFeatureName,
  HealthFeatureScope,
  HealthFeaturesResponse,
  OperationalDiagnosticsData,
} from "@/modules/analytics/health/types";

// SERVICES
export const healthService = {
  operations: (signal: AbortSignal): Promise<OperationalDiagnosticsData> =>
    httpService.get("/analytics/health/operations", {
      signal,
      headers: { "Cache-Control": "no-cache" },
    }),
  features: (
    scope: HealthFeatureScope,
    scopeId: number | null,
    signal: AbortSignal,
  ): Promise<HealthFeaturesResponse> =>
    httpService.get("/analytics/health/features", {
      params: { scope, scope_id: scopeId },
      signal,
      headers: { "Cache-Control": "no-cache" },
    }),
  updateFeature: (
    flag: HealthFeatureName,
    data: HealthFeatureChange,
  ): Promise<{ saved: boolean }> =>
    httpService.put(`/analytics/health/features/${flag}`, data),
  overview: (
    businessId: number | null,
    filters: AnalyticsFilters,
    segments: HealthSegments,
    signal: AbortSignal,
  ): Promise<HealthOverview> => {
    const params = analyticsQuery(filters);
    if (businessId) params.set("business_id", String(businessId));
    if (segments.city) params.set("city_id", segments.city);
    if (segments.category) params.set("category_id", segments.category);
    if (segments.hour) params.set("hour", segments.hour);
    return httpService.get(`/analytics/health?${params}`, {
      headers: { "Cache-Control": "no-cache" },
      signal,
    });
  },
  businesses: async (
    search: string,
    page: number,
    signal: AbortSignal,
  ): Promise<{ data: HealthBusiness[]; last_page: number }> =>
    (
      await httpService.get<{
        data: { data: HealthBusiness[]; last_page: number };
      }>("/analytics/health/classifications", {
        params: { search, page },
        headers: { "Cache-Control": "no-cache" },
        signal,
      })
    ).data,
  classify: (
    id: number,
    environment: AnalyticsEnvironment,
    reason: string,
  ): Promise<object> =>
    httpService.put(`/analytics/health/classifications/${id}`, {
      environment,
      reason,
    }),
};
