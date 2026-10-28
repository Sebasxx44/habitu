import { httpService } from "@/services/auth/authService";
import { dateRangeParams } from "@/modules/analytics/dateRange";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import type { DashboardOverview } from "@/modules/dashboard/types";

// SERVICES
export const getDashboardOverview = (
  range: DateRangeValue,
  signal: AbortSignal,
  currency?: string,
): Promise<DashboardOverview> =>
  httpService.get<DashboardOverview>("/dashboard/overview", {
    params: { ...dateRangeParams(range), currency: currency || undefined },
    signal,
  });
