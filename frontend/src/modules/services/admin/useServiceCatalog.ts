import { useSearchParams } from "react-router-dom";
import type { Service } from "@/types/models";
import type {
  ServiceCatalogState,
  ServiceSort,
  ServiceStatusFilter,
} from "@/modules/services/admin/types";

// FILTERS
const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();

// COMPOSABLE
export const useServiceCatalog = (services: Service[]): ServiceCatalogState => {
  // STATE
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const status: ServiceStatusFilter =
    params.get("status") === "active"
      ? "active"
      : params.get("status") === "inactive"
        ? "inactive"
        : "all";
  const sort: ServiceSort = ["price-asc", "price-desc", "duration"].includes(
    params.get("sort") ?? "",
  )
    ? (params.get("sort") as ServiceSort)
    : "name";
  const layout = params.get("layout") === "list" ? "list" : "grid";

  // COMPUTED
  const categories = [
    ...new Set(services.map((service) => service.category || "General")),
  ].sort((a, b) => a.localeCompare(b));
  const visible = services
    .filter(
      (service) =>
        normalize(
          `${service.name} ${service.description ?? ""} ${service.category ?? ""}`,
        ).includes(normalize(search)) &&
        (!category || (service.category || "General") === category) &&
        (status === "all" ||
          (service.is_active !== false) === (status === "active")),
    )
    .sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : sort === "duration"
            ? a.duration - b.duration
            : a.name.localeCompare(b.name),
    );

  // ACTIONS
  const filter: ServiceCatalogState["actions"]["filter"] = (key, value) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };
  const reset = () =>
    setParams(layout === "list" ? { layout } : {}, { replace: true });

  // EXPOSE
  return {
    filters: {
      search,
      category,
      status,
      sort,
      layout,
      applied: Boolean(search || category || status !== "all"),
    },
    results: {
      services: visible,
      categories,
      total: services.length,
      active: services.filter((service) => service.is_active !== false).length,
      averageDuration: services.length
        ? Math.round(
            services.reduce((sum, service) => sum + service.duration, 0) /
              services.length,
          )
        : 0,
      averagePrice: services.length
        ? services.reduce((sum, service) => sum + service.price, 0) /
          services.length
        : 0,
    },
    actions: { filter, reset },
  };
};
