// TYPES
export type FavoriteType = "business" | "service" | "professional";
export type FavoriteIds = Record<FavoriteType, number[]>;
export interface FavoriteItem {
  type: FavoriteType;
  id: number;
  name: string | null;
  business_id: number | null;
  business_name: string | null;
  image_url: string | null;
  address: string | null;
  available: boolean;
  url: string | null;
  saved_at: string;
}
export interface FavoritesPage {
  data: FavoriteItem[];
  current_page: number;
  last_page: number;
  total: number;
}
export interface FavoritesState {
  state: {
    ids: FavoriteIds;
    loading: boolean;
    pending: string | null;
    error: string;
  };
  actions: {
    toggle: (type: FavoriteType, id: number) => Promise<void>;
    remove: (type: FavoriteType, id: number) => Promise<boolean>;
    retry: () => void;
  };
}

export interface FavoritesPageState {
  results: {
    data: FavoritesPage | null;
    loading: boolean;
    error: string;
    pending: string | null;
  };
  filters: {
    type: FavoriteType | "";
    page: number;
    filter: (value: FavoriteType | "") => void;
    setPage: (value: number) => void;
  };
  actions: {
    retry: () => void;
    remove: (type: FavoriteType, id: number) => Promise<void>;
  };
}
