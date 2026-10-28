import type { Business } from "@/types/models";

// TYPES
export interface BusinessSelectionState {
  businesses: Business[];
  businessId: string;
  selectBusiness: (id: string) => void;
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
}
