import { MapPin, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { FavoriteButtonTA } from "@/modules/favorites/components/FavoriteButtonTA";
import { ProviderChecksTA } from "@/modules/provider-reviews/components/ProviderChecksTA";
import { formatNumber } from "@/i18n/formatters";
import type { Business } from "@/types/models";

// TYPES
interface BusinessProfileProps {
  business: Business;
  location?: string | null;
  onReviews: () => void;
}

// COMPONENT
export const BusinessProfileTA = ({
  business,
  location,
  onReviews,
}: BusinessProfileProps) => {
  // COMPOSABLES
  const { t } = useTranslation();

  // RENDER
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
      {business.banner_url && (
        <img
          src={business.banner_url}
          alt=""
          decoding="async"
          width={1200}
          height={500}
          className="h-44 w-full bg-secondary object-cover sm:h-64"
        />
      )}
      <div className="min-w-0 space-y-4 p-4 sm:p-7">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt=""
                width={48}
                height={48}
                decoding="async"
                className="size-12 shrink-0 rounded-xl border border-border bg-background object-cover"
              />
            )}
            <span className="min-w-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground [overflow-wrap:anywhere]">
              {business.category?.name ?? t("business.services")}
            </span>
          </div>
          <FavoriteButtonTA type="business" id={business.id} />
        </div>
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <ActionHeaderTA
            variant="plain"
            title={business.name}
            description={business.description}
          />
        </div>
        <ProviderChecksTA kind="business" id={business.id} />
        <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {location || t("business.noAddress")}
        </p>
        {(business.reviews_count ?? 0) > 0 &&
        business.rating != null &&
        Number.isFinite(Number(business.rating)) ? (
          <ButtonTA
            variant="ghost"
            className="min-h-11 max-w-full justify-start gap-1.5 whitespace-normal px-0 text-sm"
            onClick={onReviews}
          >
            <Star
              className="size-4 shrink-0 fill-amber-400 text-amber-500"
              aria-hidden="true"
            />
            <span className="font-semibold">
              {formatNumber(Number(business.rating), {
                maximumFractionDigits: 1,
              })}
            </span>
            <span className="text-muted-foreground">
              ({t("business.reviewCount", { count: business.reviews_count })})
            </span>
          </ButtonTA>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("business.noReviews")}
          </p>
        )}
      </div>
    </section>
  );
};
