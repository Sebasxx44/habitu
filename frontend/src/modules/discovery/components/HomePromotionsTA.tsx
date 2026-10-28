import { formatCurrency, formatNumber } from '@/i18n/formatters'
import { t } from 'i18next'
import { ArrowUpRight, TicketPercent } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { useHomePromotions } from "@/modules/discovery/composables/useHomePromotions";
import type { HomePromotion } from "@/modules/discovery/homePromotionTypes";

// HELPERS
const promotionLabel = (promotion: HomePromotion): string => {
  const amount = Number(promotion.discount);
  if (!Number.isFinite(amount) || amount <= 0) return t('homePromotions.available');
  if (promotion.type === "PERCENTAGE") return t('homePromotions.discount',{amount:`${formatNumber(amount)}%`});
  if (promotion.type === "FIXED_AMOUNT")
    return t('homePromotions.discount',{amount:formatCurrency(amount)});
  return t('homePromotions.available');
};

// COMPONENT
export const HomePromotionsTA = () => {
  const { results, actions } = useHomePromotions();

  return (
    <section aria-labelledby="home-promotions-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="home-promotions-title" className="text-xl font-bold tracking-tight">
            {t('homePromotions.title')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('homePromotions.description')}
          </p>
        </div>
        <ButtonTA
          variant="ghost"
          size="sm"
          render={<Link to="/cliente/benefits?tab=promotions" />}
          nativeButton={false}
        >
          {t('homePromotions.all')} <ArrowUpRight aria-hidden="true" />
        </ButtonTA>
      </div>
      {results.loading ? (
        <SkeletonTA variant="card" count={3} label={t('homePromotions.loading')} />
      ) : results.error ? (
        <StateTA
          error
          title={t('homePromotions.unavailable')}
          description={results.error}
          onRetry={actions.retry}
        />
      ) : !results.items.length ? (
        <StateTA
          title={t('homePromotions.empty')}
          description={t('homePromotions.emptyDescription')}
        />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-4 md:grid-cols-3">
            {results.items.map(
              (business) =>
                business.active_promotion && (
                  <article
                    key={business.id}
                    className="surface-primary relative flex min-w-0 flex-col items-start overflow-hidden rounded-2xl p-5 text-white"
                  >
                    <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                      <TicketPercent className="size-4" aria-hidden="true" />
                      {promotionLabel(business.active_promotion)}
                    </span>
                    <h3 className="mt-3 text-sm font-semibold leading-relaxed">
                      {business.active_promotion.title}
                    </h3>
                    <p className="mb-4 mt-1 text-xs text-muted-foreground">
                      {business.name}
                    </p>
                    <ButtonTA
                      variant="outline"
                      size="sm"
                      className="mt-auto border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                      render={<Link to={`/cliente/business/${business.id}`} />}
                      nativeButton={false}
                      aria-label={t('homePromotions.view',{business:business.name})}
                    >
                      {t('homePromotions.business')} <ArrowUpRight aria-hidden="true" />
                    </ButtonTA>
                  </article>
                ),
            )}
          </div>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            {t('homePromotions.conditions')}
          </p>
        </div>
      )}
    </section>
  );
};
