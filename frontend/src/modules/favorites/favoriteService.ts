import { httpService } from "@/services/auth/authService";
import type {
  FavoriteIds,
  FavoritesPage,
  FavoriteType,
} from "@/modules/favorites/types";

// SERVICE
export const favoriteService = {
  identifiers: async (signal?: AbortSignal): Promise<FavoriteIds> =>
    (
      await httpService.get<{ data: FavoriteIds }>("/v2/favorites/ids", {
        signal,
      })
    ).data,
  list: async (
    type: FavoriteType | "",
    page: number,
    signal?: AbortSignal,
  ): Promise<FavoritesPage> =>
    (
      await httpService.get<{ data: FavoritesPage }>("/v2/favorites", {
        params: { type: type || undefined, page, per_page: 18 },
        signal,
      })
    ).data,
  save: async (type: FavoriteType, id: number): Promise<void> => {
    await httpService.put(`/v2/favorites/${type}/${id}`, {});
  },
  remove: async (type: FavoriteType, id: number): Promise<void> => {
    await httpService.delete(`/v2/favorites/${type}/${id}`);
  },
};
