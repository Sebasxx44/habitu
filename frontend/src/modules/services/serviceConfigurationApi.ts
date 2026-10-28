import { httpService } from "@/services/auth/authService";
import type { Resource } from "@/types/models";
import type { ServiceStats } from "@/modules/services/bookingPolicyTypes";

// SERVICE
export const serviceConfigurationApi = {
  resources: async (businessId: number): Promise<Resource[]> => {
    const items: Resource[] = [];
    let page = 1;
    let lastPage: number;
    do {
      const result = await httpService.get<{
        data: { data: Resource[]; last_page: number };
      }>("/v2/resources", { params: { business_id: businessId, page } });
      items.push(...result.data.data);
      lastPage = result.data.last_page;
      page += 1;
    } while (page <= lastPage);
    return items;
  },
  stats: async (id: number): Promise<ServiceStats> =>
    (await httpService.get<{ data: ServiceStats }>(`/v2/services/${id}/stats`))
      .data,
};
