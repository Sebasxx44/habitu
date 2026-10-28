import { ArrowUpRight, Clock3, TicketPercent } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/formatters";
import { CopyBenefitCodeTA } from "@/modules/benefits/components/CopyBenefitCodeTA";
import type { BenefitPromotion } from "@/modules/benefits/types";

// COMPONENT
export const PromotionOfferTA = ({ offer }: { offer: BenefitPromotion }) => {
  const { t } = useTranslation("benefits");
  const amount = (type: string, value: number) =>
    type === "PERCENTAGE"
      ? `${formatNumber(value)}%`
      : formatCurrency(value, offer.business.currency);
  const varying = offer.services.some(
    (service) =>
      service.type !== offer.type || service.discount !== offer.discount,
  );
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative overflow-hidden bg-amber-500/10 px-6 py-5 text-amber-950 dark:text-amber-100">
        <TicketPercent className="absolute -right-3 -top-3 size-28 rotate-12 opacity-[0.07]" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">
          {offer.business.name}
        </p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">
          {varying
            ? t("perService")
            : t("discount", { amount: amount(offer.type, offer.discount) })}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs opacity-80">
          <Clock3 className="size-3.5" />
          {t("expires", { date: formatDate(offer.expires_at) })}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-semibold tracking-tight">{offer.title}</h3>
        {offer.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {offer.description}
          </p>
        )}
        <details className="my-5 text-xs">
          <summary className="cursor-pointer font-medium text-primary">
            {t("details")}
          </summary>
          <ul className="mt-3 space-y-2 leading-relaxed text-muted-foreground">
            <li>{t("noStack")}</li>
            {offer.services.length ? (
              offer.services.map((service) => (
                <li key={service.id}>
                  {service.name} ·{" "}
                  {t("discount", {
                    amount: amount(service.type, service.discount),
                  })}
                </li>
              ))
            ) : (
              <li>{t("allServices")}</li>
            )}
            {offer.min_purchase > 0 && (
              <li>
                {t("minimum", {
                  amount: formatCurrency(
                    offer.min_purchase,
                    offer.business.currency,
                  ),
                })}
              </li>
            )}
            {offer.max_discount !== null && (
              <li>
                {t("cap", {
                  amount: formatCurrency(
                    offer.max_discount,
                    offer.business.currency,
                  ),
                })}
              </li>
            )}
            {offer.remaining_for_you !== null && (
              <li>{t("limit", { count: offer.remaining_for_you })}</li>
            )}
            {offer.remaining_uses !== null && (
              <li>{t("totalLimit", { count: offer.remaining_uses })}</li>
            )}
          </ul>
        </details>
        <div className="mt-auto space-y-4">
          {offer.code && <CopyBenefitCodeTA code={offer.code} />}
          {offer.eligible ? (
            <ButtonTA
              className="w-full"
              render={<Link to={offer.url} />}
              nativeButton={false}
            >
              {t("apply")}
              <ArrowUpRight />
            </ButtonTA>
          ) : (
            <ButtonTA className="w-full" disabled>
              {t("exhausted")}
            </ButtonTA>
          )}
        </div>
      </div>
    </article>
  );
};
