import { httpService } from "@/services/auth/authService";
import type { BookingApiResponse } from "@/composables/booking/types";
import type { BusinessProfile } from "@/modules/businesses/types";

// SERVICES
export const publicBusinessService = {
  getById: async (id: number): Promise<BusinessProfile> => {
    const response = await httpService.get<BookingApiResponse<BusinessProfile>>(
      `/v2/public/businesses/${id}`,
    );
    const profile = response.data;
    const mainBranch =
      profile.main_branch ??
      profile.mainBranch ??
      profile.branches?.find((branch) => branch.is_main_branch) ??
      profile.branches?.[0];
    return {
      ...profile,
      main_branch: mainBranch,
      mainBranch,
      address: profile.address ?? mainBranch?.address,
      lat: profile.lat ?? mainBranch?.lat,
      lng: profile.lng ?? mainBranch?.lng,
      phone: profile.phone ?? mainBranch?.phone,
    };
  },
};
