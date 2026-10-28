import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { DiscoverySearchTA } from "@/modules/discovery/components/DiscoverySearchTA";
import { discoveryDay } from "@/modules/discovery/query";
import type { RefObject } from "react";
import type { DiscoveryHeroProps } from "@/modules/discovery/hero/types";

// TYPES
interface DiscoverySearchPanelProps extends DiscoveryHeroProps {
  formRef: RefObject<HTMLFormElement>;
}

// COMPONENT
export const DiscoverySearchPanelTA = ({
  search,
  filters,
  location,
  onFilters,
  formRef,
}: DiscoverySearchPanelProps) => {
  const { t: ui } = useTranslation("discoveryUi");
  return (
    <div className="surface-card rounded-3xl border border-border bg-card p-3 shadow-[0_16px_48px_rgb(8_18_35/0.1)] sm:p-4">
      <form
        ref={formRef}
        aria-label={ui("heroSearchLabel")}
        className="relative z-20 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1 rounded-2xl border border-border bg-background p-2"
        onSubmit={(event) => {
          event.preventDefault();
          search.setSuggest(false);
          filters.change({ page: "1" });
        }}
      >
        <div className="min-w-0">
          <DiscoverySearchTA search={search} />
        </div>
        <ButtonTA type="submit" className="my-1 min-h-12 px-3 sm:px-7">
          <Search className="size-4" aria-hidden="true" />
          {ui("searchAction")}
        </ButtonTA>
        <details className="group col-span-2 min-w-0 border-t border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="font-medium">{ui("locationAndDate")}</span>
              <span className="ml-2 text-muted-foreground [overflow-wrap:anywhere]">
                {[filters.values.zone, filters.values.date]
                  .filter(Boolean)
                  .join(" · ") || ui("optionalSearch")}
              </span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="grid min-w-0 gap-2 border-t border-border pt-2 sm:grid-cols-2">
            <label className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2">
              <MapPin
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold">
                  {ui("where")}
                </span>
                <InputTA
                  aria-label={ui("zoneAddress")}
                  value={filters.values.zone}
                  onChange={(event) =>
                    filters.change({
                      zone: event.target.value,
                      lat: "",
                      lng: "",
                    })
                  }
                  placeholder={ui("wherePlaceholder")}
                  className="h-11 min-h-11 min-w-0 border-0 bg-transparent p-0 text-base shadow-none"
                />
              </span>
            </label>
            <label className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-2">
              <CalendarDays
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold">
                  {ui("when")}
                </span>
                <InputTA
                  aria-label={ui("preferredDay")}
                  type="date"
                  min={discoveryDay()}
                  value={filters.values.date}
                  onChange={(event) =>
                    filters.change({
                      date: event.target.value,
                      date_to: "",
                      available: event.target.value ? "1" : "",
                    })
                  }
                  className="h-11 min-h-11 w-full min-w-0 border-0 bg-transparent p-0 text-base shadow-none"
                />
              </span>
            </label>
          </div>
        </details>
      </form>
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1">
        <ButtonTA
          variant="ghost"
          size="sm"
          className="min-h-11 text-xs text-muted-foreground"
          onClick={location.point ? location.clear : location.locate}
          disabled={location.loading}
        >
          <Navigation className="size-3.5" />
          {ui(
            location.loading
              ? "locating"
              : location.point
                ? "removeNearby"
                : "nearby",
          )}
        </ButtonTA>
        <ButtonTA
          variant="ghost"
          size="sm"
          className="min-h-11 text-xs text-muted-foreground"
          onClick={onFilters}
        >
          <SlidersHorizontal className="size-3.5" />
          {ui("filters")}
          {filters.count > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {filters.count}
            </span>
          )}
        </ButtonTA>
        <Link
          to="/cliente/ai-chat"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:ml-auto"
        >
          <Sparkles className="size-3.5" />
          {ui("helpChoose")}
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
};
