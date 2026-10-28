import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import type { ServiceCatalogState } from "@/modules/services/catalog/types";

// COMPONENT
export const ServiceCatalogFilterTA = ({
  catalog,
  filters,
}: ServiceCatalogState) => {
  // COMPOSABLES
  const { t: ui } = useTranslation("discoveryUi");

  // RENDER
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <InputTA
            type="search"
            aria-label={ui("searchCatalog")}
            placeholder={ui("searchCatalog")}
            value={filters.query}
            onChange={(event) => filters.search(event.target.value)}
            className="bg-card pl-10 pr-11 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {!!filters.query && (
            <ButtonTA
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => filters.search("")}
              aria-label={ui("clearSearch")}
              className="absolute right-1 top-1/2 size-9 min-h-9 -translate-y-1/2"
            >
              <X className="size-4" />
            </ButtonTA>
          )}
        </div>
        <select
          aria-label={ui("sortServices")}
          value={filters.sort}
          onChange={(event) => filters.order(event.target.value)}
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-xs sm:max-w-44"
        >
          <option value="original">{ui("defaultOrder")}</option>
          <option value="price">{ui("lowestPrice")}</option>
          <option value="duration">{ui("shortestDuration")}</option>
        </select>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-xs text-muted-foreground"
      >
        {ui("serviceMatches", {
          count: catalog.visible.length,
          total: catalog.total,
        })}
      </p>
    </div>
  );
};
