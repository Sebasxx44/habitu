import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { useBusinessCategories } from "@/hooks/useBusinessCategories";
import { BusinessCardTA } from "@/modules/discovery/components/BusinessCardTA";
import { DiscoveryCategoriesTA } from "@/modules/discovery/components/DiscoveryCategoriesTA";
import { DiscoveryFiltersTA } from "@/modules/discovery/components/DiscoveryFiltersTA";
import { DiscoveryHeroTA } from "@/modules/discovery/components/DiscoveryHeroTA";
import { useDiscoverySearch } from "@/modules/discovery/composables/useDiscoverySearch";
import { discoveryQuery } from "@/modules/discovery/query";

// COMPONENT
export const HomeDiscoveryTA = () => {
  // COMPOSABLES
  const { t: ui } = useTranslation("discoveryUi");
  const { results, filters, search, location, favorites } =
    useDiscoverySearch();
  const { categories, error: categoryError } = useBusinessCategories();
  // STATE
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // DERIVED STATE
  const explorePath = `/cliente/explore?${discoveryQuery(filters.values)}`;
  const feedback = location.error || favorites.error || categoryError;
  // RENDER
  return (
    <div className="space-y-5">
      <DiscoveryHeroTA
        search={search}
        filters={filters}
        location={location}
        onFilters={() => setShowFilters(true)}
      />
      <DiscoveryCategoriesTA categories={categories} filters={filters} />
      {feedback && (
        <p
          role="status"
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
        >
          {feedback}
        </p>
      )}
      <section aria-labelledby="home-discovery-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              id="home-discovery-title"
              className="text-xl font-bold tracking-tight"
            >
              {ui("nextPlan")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {ui("recommendedDescription")}
            </p>
          </div>
          <ButtonTA
            variant="ghost"
            className="shrink-0 text-xs text-primary"
            render={<Link to={explorePath} />}
            nativeButton={false}
          >
            {ui("seeAll")}
            <ArrowRight className="size-4" />
          </ButtonTA>
        </div>
        {results.loading ? (
          <SkeletonTA variant="card" count={3} label={ui("loadingPlaces")} />
        ) : results.error ? (
          <StateTA
            error
            title={ui("searchFailed")}
            description={results.error}
            onRetry={results.reload}
          />
        ) : results.page.data.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {results.page.data.slice(0, 3).map((business) => (
              <BusinessCardTA
                key={business.id}
                business={business}
                selected={selectedId === business.id}
                favorite={favorites.ids.includes(business.id)}
                busy={favorites.busy !== null}
                onSelect={() => setSelectedId(business.id)}
                onFavorite={() => void favorites.toggle(business.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card pb-5 text-center">
            <StateTA
              title={ui("emptyTitle")}
              description={ui("emptyDescription")}
            />
            <ButtonTA variant="outline" onClick={filters.clear}>
              {ui("clearFilters")}
            </ButtonTA>
          </div>
        )}
      </section>
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
