import { httpService } from "@/services/auth/authService";
import type {
  CommerceContext,
  CommerceResponse,
  GiftForm,
  GiftVoucher,
  PackageBookingForm,
  PackageForm,
  PackageProposal,
  ServicePackage,
} from "@/modules/commerce/types";

// SERVICES
export const commerceService = {
  context: (businessId: string, signal: AbortSignal) =>
    httpService.get<CommerceResponse<CommerceContext>>(
      `/v2/commerce${businessId ? `?business_id=${businessId}` : ""}`,
      { signal },
    ),
  createPackage: (businessId: number, form: PackageForm) =>
    httpService.post<CommerceResponse<ServicePackage>>(
      "/v2/commerce/packages",
      {
        business_id: businessId,
        name: form.name,
        description: form.description,
        service_ids: form.serviceIds,
      },
    ),
  removePackage: (id: number) =>
    httpService.delete<CommerceResponse<null>>(`/v2/commerce/packages/${id}`),
  preview: (id: number, form: PackageBookingForm) =>
    httpService.post<CommerceResponse<PackageProposal>>(
      `/v2/commerce/packages/${id}/preview`,
      {
        branch_id: Number(form.branchId),
        date: form.date,
        start_time: form.startTime,
      },
    ),
  confirm: (id: string, key: string) =>
    httpService.post<CommerceResponse<PackageProposal>>(
      `/v2/commerce/package-proposals/${id}/confirm`,
      { accepted_terms: true, idempotency_key: key },
    ),
  issue: (businessId: number, form: GiftForm, key: string) =>
    httpService.post<CommerceResponse<GiftVoucher>>("/v2/commerce/gifts", {
      business_id: businessId,
      service_id: Number(form.serviceId),
      expires_at: form.expiresAt,
      restrictions: form.restrictions,
      idempotency_key: key,
    }),
  claim: (code: string) =>
    httpService.post<CommerceResponse<GiftVoucher>>(
      "/v2/commerce/gifts/claim",
      { code },
    ),
  redeem: (code: string, appointmentId: string) =>
    httpService.post<CommerceResponse<GiftVoucher>>(
      "/v2/commerce/gifts/redeem",
      { code, appointment_id: Number(appointmentId) },
    ),
};
