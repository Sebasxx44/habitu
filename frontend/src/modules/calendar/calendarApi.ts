import { httpService } from "@/services/auth/authService";
import type { BookingApiResponse } from "@/composables/booking/types";

// TYPES
interface DirectoryPage<T> {
  data: T[];
  last_page: number;
}

// SERVICES
export const calendarDirectory = async <T>(
  path: string,
  businessId: number,
  signal: AbortSignal,
): Promise<T[]> => {
  const records: T[] = [];
  let page = 1;
  let lastPage: number;
  do {
    const response = await httpService.get<
      BookingApiResponse<DirectoryPage<T> | T[]>
    >(path, { params: { business_id: businessId, page }, signal });
    if (Array.isArray(response.data)) return response.data;
    records.push(...response.data.data);
    lastPage = response.data.last_page;
    page += 1;
  } while (page <= lastPage);
  return records;
};
