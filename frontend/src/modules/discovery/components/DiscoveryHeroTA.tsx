import { BookingIntentsTA } from "@/modules/discovery/components/BookingIntentsTA";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { DiscoverySearchTA } from "@/modules/discovery/components/DiscoverySearchTA";
import { discoveryDay } from "@/modules/discovery/query";
import type { DiscoverySearchState } from "@/modules/discovery/searchTypes";

// TYPES
interface DiscoveryHeroProps {
  search: DiscoverySearchState["search"];
  filters: DiscoverySearchState["filters"];
  location: DiscoverySearchState["location"];
  onFilters: () => void;
}

// COMPONENT
export const DiscoveryHeroTA = ({
  search,
  filters,
  location,
  onFilters,
}: DiscoveryHeroProps) => {
  const { t: ui } = useTranslation("discoveryUi");
  return (
    <section className="surface-card relative isolate rounded-[28px] border border-primary/15 bg-card px-4 py-5 shadow-[var(--shadow-soft)] sm:px-7 sm:py-7">
      <div className="relative z-10 flex items-center justify-between gap-6">
        <ActionHeaderTA
          icon={Search}
          eyebrow={ui("eyebrow")}
          title={ui("title")}
          description={ui("description")}
        />
        <div
          className="surface-primary relative hidden w-52 shrink-0 -rotate-3 rounded-3xl p-6 text-white lg:block"
          aria-hidden="true"
        >
          <Sparkles className="mb-5 size-8 stroke-[1.4] text-accent" />
          <p className="max-w-40 text-[26px] font-semibold leading-tight tracking-tight">
            {ui("heroAside")}
          </p>
          <ArrowUpRight className="absolute bottom-4 right-4 size-9 -rotate-12 stroke-[1.2] text-accent" />
          <span className="mt-3 block h-1.5 w-20 rounded-full bg-accent" />
        </div>
      </div>
      <BookingIntentsTA />
      <form
        className="relative z-20 mt-7 grid gap-1 rounded-2xl border border-border bg-background p-2 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.4fr)_minmax(130px,1fr)_minmax(150px,1fr)_auto] lg:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          search.setSuggest(false);
          filters.change({ page: "1" });
        }}
      >
        <div className="min-w-0">
          <DiscoverySearchTA search={search} />
        </div>
        <label className="flex min-w-0 items-center gap-3 border-t border-border px-3 py-1 sm:border-l sm:border-t-0">
          <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold">{ui("where")}</span>
            <InputTA
              aria-label={ui("zoneAddress")}
              value={filters.values.zone}
              onChange={(event) =>
                filters.change({ zone: event.target.value, lat: "", lng: "" })
              }
              placeholder={ui("wherePlaceholder")}
              className="h-7 min-h-7 border-0 bg-transparent p-0 text-xs shadow-none"
            />
          </span>
        </label>
        <label className="flex min-w-0 items-center gap-3 border-t border-border px-3 py-1 lg:border-l lg:border-t-0">
          <CalendarDays
            className="size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold">{ui("when")}</span>
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
              className="h-7 min-h-7 w-full border-0 bg-transparent p-0 text-xs shadow-none"
            />
          </span>
        </label>
        <ButtonTA type="submit" className="m-1 min-h-11 px-7">
          <Search className="size-4" />
          {ui("searchAction")}
        </ButtonTA>
      </form>
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1">
        <ButtonTA
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
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
          className="text-xs text-muted-foreground"
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
          className="ml-auto inline-flex min-h-10 items-center gap-1.5 px-2 text-xs font-medium text-primary hover:underline"
        >
          <Sparkles className="size-3.5" />
          {ui("helpChoose")}
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </section>
  );
};
