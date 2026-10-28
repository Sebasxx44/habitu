import type { BookingService } from "@/composables/booking/types";

// TYPES
export type CatalogSort = "original" | "price" | "duration";

export interface ServiceCatalogState {
  catalog: {
    visible: BookingService[];
    total: number;
  };
  filters: {
    query: string;
    sort: CatalogSort;
    search: (query: string) => void;
    order: (sort: string) => void;
    clear: () => void;
  };
}
