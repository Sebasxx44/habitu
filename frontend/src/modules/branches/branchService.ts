import { httpService } from "@/services/auth/authService";
import type {
  BranchPage,
  BranchPayload,
} from "@/modules/branches/types";

// SERVICES
export const branchService = {
  list: (
    businessId: number,
    filters: {
      search: string;
      active: string;
      start_date: string;
      end_date: string;
      currency: string;
      page: number;
    },
    signal: AbortSignal,
  ): Promise<{ data: BranchPage }> =>
    httpService.get("/v2/branches", {
      params: {
        business_id: businessId,
        analytics: 1,
        ...filters,
        active: filters.active === "" ? undefined : filters.active,
      },
      signal,
    }),
  save: (id: number | null, payload: BranchPayload): Promise<object> =>
    id
      ? httpService.put(`/v2/branches/${id}`, payload)
      : httpService.post("/v2/branches", payload),
  remove: (id: number): Promise<object> =>
    httpService.delete(`/v2/branches/${id}`),
};
