import { useEffect, useState } from "react";
import type { BookingService } from "@/composables/booking/types";
import type {
  CatalogSort,
  ServiceCatalogState,
} from "@/modules/services/catalog/types";

// HELPERS
const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();

// COMPOSABLE
export const useServiceCatalog = (
  services: BookingService[],
  businessId: string | undefined,
): ServiceCatalogState => {
  // STATE
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSort>("original");

  // LIFECYCLE
  useEffect(() => {
    setQuery("");
    setSort("original");
  }, [businessId]);

  // DERIVED STATE
  const searchTerm = normalize(query);
  const visible = services.filter((service) =>
    normalize(`${service.name} ${service.description ?? ""}`).includes(
      searchTerm,
    ),
  );
  if (sort === "price")
    visible.sort((first, second) => Number(first.price) - Number(second.price));
  if (sort === "duration")
    visible.sort(
      (first, second) =>
        (first.duration_minutes ?? first.duration) -
        (second.duration_minutes ?? second.duration),
    );

  // EXPOSE
  return {
    catalog: { visible, total: services.length },
    filters: {
      query,
      sort,
      search: setQuery,
      order: (value) =>
        setSort(value === "price" || value === "duration" ? value : "original"),
      clear: () => {
        setQuery("");
        setSort("original");
      },
    },
  };
};
