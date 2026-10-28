import { httpService } from "@/services/auth/authService";
import type { Service } from "@/types/models";
import type {
  AdminServiceResponse,
  ServicesPageResponse,
} from "@/modules/services/admin/types";

// NORMALIZATION
const normalize = (service: AdminServiceResponse): Service => ({
  ...service,
  price: Number(service.price),
  duration: service.duration_minutes ?? service.duration,
  category:
    typeof service.category === "string"
      ? service.category
      : service.category?.name,
});

// SERVICE
export const adminServicesApi = {
  list: async (businessId: number): Promise<Service[]> => {
    const services: Service[] = [];
    let page = 1;
    let lastPage: number;
    do {
      const response = await httpService.get<ServicesPageResponse>(
        "/v2/services",
        { params: { business_id: businessId, page } },
      );
      services.push(...response.data.data.map(normalize));
      lastPage = response.data.last_page;
      page += 1;
    } while (page <= lastPage);
    return services;
  },
  save: async (
    payload: Partial<Service> & { resource_ids?: number[] },
    id?: number,
  ): Promise<Service> => {
    const response = id
      ? await httpService.put<{ data: AdminServiceResponse }>(
          `/v2/services/${id}`,
          payload,
        )
      : await httpService.post<{ data: AdminServiceResponse }>(
          "/v2/services",
          payload,
        );
    return normalize(response.data);
  },
  remove: async (id: number): Promise<void> => {
    await httpService.delete(`/v2/services/${id}`);
  },
};
