import { httpService } from "@/services/auth/authService";
import type {
  ClientApiResponse,
  ClientAppointmentRecord,
  ClientDraft,
  ClientRecord,
  ClientsPage,
} from "@/modules/clients/types";

// SERVICES
export const clientsService = {
  list: async (
    businessId: number,
    signal: AbortSignal,
  ): Promise<ClientRecord[]> => {
    const records: ClientRecord[] = [];
    let page = 1;
    let lastPage: number;
    do {
      const response = await httpService.get<ClientApiResponse<ClientsPage>>(
        `/v2/clients?business_id=${businessId}&page=${page}`,
        { signal },
      );
      records.push(...response.data.data);
      lastPage = response.data.last_page;
      page += 1;
    } while (page <= lastPage && !signal.aborted);
    return records;
  },
  get: async (id: number, signal: AbortSignal): Promise<ClientRecord> =>
    (
      await httpService.get<ClientApiResponse<ClientRecord>>(
        `/v2/clients/${id}`,
        { signal },
      )
    ).data,
  history: async (
    id: number,
    businessId: number,
    signal: AbortSignal,
  ): Promise<ClientAppointmentRecord[]> =>
    (
      await httpService.get<ClientApiResponse<ClientAppointmentRecord[]>>(
        `/v2/appointments?business_id=${businessId}&client_id=${id}`,
        { signal },
      )
    ).data,
  save: async (
    values: ClientDraft,
    businessId: number,
    id?: number,
  ): Promise<ClientRecord> => {
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || null,
      notes: values.notes.trim() || null,
      business_id: businessId,
    };
    const response = id
      ? await httpService.put<ClientApiResponse<ClientRecord>>(
          `/v2/clients/${id}`,
          payload,
        )
      : await httpService.post<ClientApiResponse<ClientRecord>>(
          "/v2/clients",
          payload,
        );
    return response.data;
  },
  remove: async (id: number): Promise<void> => {
    await httpService.delete(`/v2/clients/${id}`);
  },
};
