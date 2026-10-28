import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Clock3,
  House,
  Navigation,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { BusinessCardTA } from "@/modules/discovery/components/BusinessCardTA";
import { DiscoveryFiltersTA } from "@/modules/discovery/components/DiscoveryFiltersTA";
import { useExpressDiscovery } from "@/modules/marketplace/composables/useExpressDiscovery";
import { quickMoments } from "@/modules/marketplace/timeWindows";
import { useBusinessCategories } from "@/hooks/useBusinessCategories";
import { AvailabilityAlertsTA } from "@/modules/marketplace/alerts/AvailabilityAlertsTA";
import { cn } from "@/lib/utils";

// PAGE
export const ExpressPage = () => {
  const { t } = useTranslation("marketplace");
  const {
    discovery: { results, filters, location, favorites },
    timing,
  } = useExpressDiscovery();
  const { categories } = useBusinessCategories();
  const [showFilters, setShowFilters] = useState(false);
  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      <section className="discovery-intro relative overflow-hidden rounded-3xl border border-border p-5 sm:p-9">
        <div className="relative flex items-start justify-between gap-4">
          <ActionHeaderTA
            eyebrow={t("express.eyebrow")}
            title={t("express.title")}
            description={t("express.description")}
          />
          <Zap
            aria-hidden="true"
            className="hidden size-16 shrink-0 stroke-1 text-primary sm:block"
          />
        </div>
        <div
          className="relative mt-7 flex flex-wrap gap-2"
          aria-label={t("express.filters")}
        >
          {quickMoments.map((moment) => (
            <ButtonTA
              key={moment}
              variant={timing.moment === moment ? "default" : "outline"}
              onClick={() => timing.choose(moment)}
              aria-pressed={timing.moment === moment}
              className="text-xs"
            >
              <Clock3 className="size-3.5" />
              {t(`express.${moment}`)}
            </ButtonTA>
          ))}
        </div>
        <div className="relative mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-xs font-medium">
            {t("express.zone")}
            <InputTA
              className="mt-2 bg-card"
              placeholder={t("express.zonePlaceholder")}
              value={filters.values.zone}
              onChange={(event) =>
                filters.change({ zone: event.target.value, lat: "", lng: "" })
              }
            />
          </label>
          <ButtonTA
            variant="outline"
            disabled={location.loading}
            onClick={location.point ? location.clear : location.locate}
          >
            <Navigation className="size-4" />
            <span className="hidden sm:inline">
              {t(
                location.loading
                  ? "express.locating"
                  : location.point
                    ? "express.removeLocation"
                    : "express.nearby",
              )}
            </span>
          </ButtonTA>
          <ButtonTA variant="outline" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal className="size-4" />
            <span className="sr-only">{t("express.filters")}</span>
          </ButtonTA>
        </div>
      </section>
      <section aria-labelledby="express-categories">
        <h2 id="express-categories" className="mb-3 text-sm font-semibold">
          {t("express.categories")}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => filters.change({ category_id: "" })}
            aria-pressed={!filters.values.category_id}
            className={cn(
              "min-h-12 shrink-0 rounded-2xl border px-5 text-sm",
              !filters.values.category_id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card",
            )}
          >
            {t("express.all")}
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                filters.change({ category_id: String(category.id) })
              }
              aria-pressed={filters.values.category_id === String(category.id)}
              className={cn(
                "min-h-12 shrink-0 rounded-2xl border px-5 text-sm",
                filters.values.category_id === String(category.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>
      {(location.error || favorites.error) && (
        <p role="status" className="text-sm text-muted-foreground">
          {location.error || favorites.error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("express.results")}</h2>
        <p role="status" className="text-xs text-muted-foreground">
          {t("express.available", { count: results.page.total })}
        </p>
      </div>
      {results.loading ? (
        <div
          className="discovery-results-grid"
          role="status"
          aria-label={t("express.loading")}
        >
          {[1, 2, 3].map((value) => (
            <div
              key={value}
              className="h-96 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : results.error ? (
        <StateTA
          error
          title={t("express.error")}
          description={results.error}
          onRetry={results.reload}
        />
      ) : !results.page.data.length ? (
        <StateTA
          title={t("express.empty")}
          description={t("express.emptyDetail")}
        />
      ) : (
        <div className="discovery-results-grid">
          {results.page.data.map((business) => (
            <BusinessCardTA
              key={business.id}
              business={business}
              source="express"
              selected={false}
              onSelect={() => undefined}
              favorite={favorites.ids.includes(business.id)}
              busy={favorites.busy !== null}
              onFavorite={() => void favorites.toggle(business.id)}
            />
          ))}
        </div>
      )}
      {results.page.last_page > 1 && (
        <div className="flex justify-center gap-3">
          <ButtonTA
            variant="outline"
            disabled={results.page.current_page === 1 || results.loading}
            onClick={() =>
              filters.change({ page: String(results.page.current_page - 1) })
            }
          >
            {t("booking.back")}
          </ButtonTA>
          <span className="self-center text-sm">
            {results.page.current_page} / {results.page.last_page}
          </span>
          <ButtonTA
            variant="outline"
            disabled={
              results.page.current_page === results.page.last_page ||
              results.loading
            }
            onClick={() =>
              filters.change({ page: String(results.page.current_page + 1) })
            }
          >
            {t("booking.next")}
          </ButtonTA>
        </div>
      )}
      <AvailabilityAlertsTA />
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5">
        <House className="size-7 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{t("express.homeService")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("express.homeDescription")}
          </p>
        </div>
        <ButtonTA
          variant="outline"
          render={<Link to="/cliente/home-service" />}
          nativeButton={false}
        >
          {t("express.requestHome")}
          <ArrowUpRight className="size-4" />
        </ButtonTA>
      </div>
      <DiscoveryFiltersTA
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        categories={categories}
        hasLocation={!!location.point}
      />
    </div>
  );
};
