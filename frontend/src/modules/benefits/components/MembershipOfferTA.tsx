import { Check, Crown, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { formatCurrency, formatNumber } from "@/i18n/formatters";
import type { BenefitAction, BenefitPlan } from "@/modules/benefits/types";

// COMPONENT
export const MembershipOfferTA = ({
  plan,
  active,
  pending,
  checkoutEnabled,
  select,
  pay,
}: {
  plan: BenefitPlan;
  active: boolean;
  pending: boolean;
  checkoutEnabled: boolean;
  select: (action: BenefitAction) => void;
  pay: (id: number) => Promise<void>;
}) => {
  const { t } = useTranslation("benefits");
  const paid = Number(plan.price) > 0;
  return (
    <article className="flex min-w-0 flex-col rounded-3xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          {plan.business.name}
        </span>
        <Crown className="size-5 text-amber-600 dark:text-amber-300" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{plan.name}</h3>
      <p className="mt-4 text-3xl font-semibold tracking-tight">
        {paid ? formatCurrency(Number(plan.price), plan.currency) : t("free")}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          / {t(`cycles.${plan.billing_cycle}`)}
        </span>
      </p>
      {plan.description && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {plan.description}
        </p>
      )}
      <ul className="my-6 space-y-3 text-sm">
        {plan.appointments_included > 0 && (
          <li className="flex gap-2">
            <Check className="size-4 shrink-0 text-primary" />
            {t("appointments", { count: plan.appointments_included })}
          </li>
        )}
        {Number(plan.discount_percentage) > 0 && (
          <li className="flex gap-2">
            <Check className="size-4 shrink-0 text-primary" />
            {t(plan.appointments_included ? "afterIncluded" : "percentage", {
              amount: formatNumber(Number(plan.discount_percentage)),
            })}
          </li>
        )}
        {plan.benefits?.map((benefit) => (
          <li className="flex gap-2" key={benefit}>
            <Check className="size-4 shrink-0 text-primary" />
            {benefit}
          </li>
        ))}
      </ul>
      <details className="mb-6 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-primary">
          {t("details")}
        </summary>
        <p className="mt-3 leading-relaxed">{t("planRules")}</p>
        <p className="mt-3 font-medium">{t("includedServices")}</p>
        <ul className="mt-2 space-y-1">
          {plan.eligible_services?.length ? (
            plan.eligible_services.map((service) => (
              <li key={service.id}>{service.name}</li>
            ))
          ) : (
            <li>{t("allServices")}</li>
          )}
        </ul>
      </details>
      <ButtonTA
        className="mt-auto w-full"
        variant={active ? "outline" : "default"}
        disabled={pending || active || (paid && !checkoutEnabled)}
        onClick={() => {
          if (paid) void pay(plan.id);
          else select({ kind: "subscribe", plan });
        }}
      >
        {paid && !active && <ShieldCheck />}
        {active
          ? t("alreadyActive")
          : paid
            ? t(checkoutEnabled ? "buy" : "paymentUnavailable")
            : t("activate")}
      </ButtonTA>
    </article>
  );
};
