import { isAxiosError } from "axios";
import { httpService } from "@/services/auth/authService";
import type {
  BlockDraft,
  OperationsContext,
  OperationSchedule,
  ResourceDraft,
} from "@/modules/operations/types";

// HELPERS
export const operationError = (failure: Error, fallback: string): string => {
  if (
    !isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(
      failure,
    )
  )
    return fallback;
  return (
    Object.values(failure.response?.data.errors ?? {})
      .flat()
      .join(" ") ||
    failure.response?.data.message ||
    fallback
  );
};

// SERVICES
export const operationsService = {
  context: async (
    businessId: string,
    signal: AbortSignal,
  ): Promise<OperationsContext> =>
    (
      await httpService.get<{ data: OperationsContext }>(
        "/v2/operations/context",
        {
          params: { business_id: businessId || undefined },
          headers: { "Cache-Control": "no-cache" },
          signal,
        },
      )
    ).data,
  schedule: (
    id: number,
    branchId: number,
    slots: OperationSchedule[],
  ): Promise<object> =>
    httpService.put(`/v2/operations/professionals/${id}/schedule`, {
      branch_id: branchId,
      slots,
    }),
  services: (
    id: number,
    branchId: number,
    serviceIds: number[],
  ): Promise<object> =>
    httpService.put(`/v2/operations/professionals/${id}/services`, {
      branch_id: branchId,
      service_ids: serviceIds,
    }),
  block: (businessId: number, draft: BlockDraft): Promise<object> => {
    const [target, value] = draft.target.split(":");
    const kind =
      target === "professional"
        ? "ABSENCE"
        : target === "resource"
          ? "MAINTENANCE"
          : "CLOSURE";
    return httpService.post("/v2/operations/blocks", {
      business_id: businessId,
      [`${target}_id`]: Number(value),
      kind,
      starts_at: draft.starts_at,
      ends_at: draft.ends_at,
      reason: draft.reason,
    });
  },
  removeBlock: (id: number): Promise<object> =>
    httpService.delete(`/v2/operations/blocks/${id}`),
  resource: async (
    businessId: number,
    id: number,
    draft: ResourceDraft,
  ): Promise<number> => {
    const body = { ...draft, business_id: businessId };
    const response = id
      ? await httpService.put<{ data: { id: number } }>(
          `/v2/resources/${id}`,
          body,
        )
      : await httpService.post<{ data: { id: number } }>("/v2/resources", body);
    return response.data.id;
  },
  resourceServices: (id: number, serviceIds: number[]): Promise<object> =>
    httpService.put(`/v2/operations/resources/${id}/services`, {
      service_ids: serviceIds,
    }),
};
