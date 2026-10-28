import { httpService } from "@/services/auth/authService";
import type {
  ProfessionalDashboard,
  ProfessionalForm,
  ProfessionalRecord,
  ProfessionalResponse,
} from "@/modules/professionals/types";

// HELPERS
const normalize = (item: ProfessionalResponse["data"]): ProfessionalRecord => ({
  ...item,
  is_active: item.is_active ?? item.active ?? false,
  commission_percentage: Number(item.commission_percentage ?? 0),
  availability: item.availability ?? [],
  services: item.services ?? [],
  portfolios: item.portfolios ?? [],
});

// SERVICES
export const professionalsService = {
  list: async (businessId: number): Promise<ProfessionalRecord[]> => {
    const response = await httpService.get<{
      data: ProfessionalResponse["data"][];
    }>(`/v2/professionals?business_id=${businessId}`);
    return response.data.map(normalize);
  },
  find: async (id: number): Promise<ProfessionalRecord> => {
    const response = await httpService.get<ProfessionalResponse>(
      `/v2/professionals/${id}`,
    );
    return normalize(response.data);
  },
  save: async (
    form: ProfessionalForm,
    businessId: number,
    id?: number,
  ): Promise<ProfessionalRecord> => {
    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      specialty: form.specialty.trim(),
      commission_percentage: Number(form.commission_percentage),
      business_id: businessId,
    };
    const response = id
      ? await httpService.put<ProfessionalResponse>(
          `/v2/professionals/${id}`,
          payload,
        )
      : await httpService.post<ProfessionalResponse>(
          "/v2/professionals",
          payload,
        );
    return normalize(response.data);
  },
  remove: async (id: number): Promise<void> => {
    await httpService.delete(`/v2/professionals/${id}`);
  },
  deactivate: async (id: number): Promise<void> => {
    await httpService.put(`/v2/professionals/${id}`, { is_active: false });
  },
  dashboard: (
    id: number,
    startDate: string,
    endDate: string,
    currency?: string,
  ): Promise<ProfessionalDashboard> => {
    const query = new URLSearchParams({
      barber_id: String(id),
      start_date: startDate,
      end_date: endDate,
    });
    if (currency) query.set("currency", currency);
    return httpService.get<ProfessionalDashboard>(
      `/dashboard/barbero?${query}`,
    );
  },
};
