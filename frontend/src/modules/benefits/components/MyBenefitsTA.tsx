import { CalendarDays, Gift, History } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatDate, formatNumber } from "@/i18n/formatters";
import { CopyBenefitCodeTA } from "@/modules/benefits/components/CopyBenefitCodeTA";
import type { BenefitAction, BenefitsCatalog } from "@/modules/benefits/types";

// COMPONENT
export const MyBenefitsTA = ({
  data,
  pending,
  select,
}: {
  data: BenefitsCatalog;
  pending: boolean;
  select: (action: BenefitAction) => void;
}) => {
  const { t } = useTranslation("benefits");
  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">{t("myTitle")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("myDescription")}
        </p>
        {data.vouchers.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.vouchers.map((voucher) => (
              <article
                key={voucher.id}
                className="rounded-3xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex justify-between gap-3">
                  <Gift className="size-5 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {t(`voucherStatus.${voucher.status}`)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {voucher.business_name}
                </p>
                <h3 className="mb-4 mt-2 font-semibold">{voucher.reward}</h3>
                <CopyBenefitCodeTA code={voucher.code} />
                <p className="mt-4 text-xs text-muted-foreground">
                  {t("expires", { date: formatDate(voucher.expires_at) })}
                </p>
                {voucher.used_at && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("delivered", { date: formatDate(voucher.used_at) })}
                  </p>
                )}
                <ButtonTA
                  className="mt-4 w-full"
                  variant="outline"
                  render={
                    <Link to={`/cliente/business/${voucher.business_id}`} />
                  }
                  nativeButton={false}
                >
                  {t("business")}
                </ButtonTA>
              </article>
            ))}
          </div>
        ) : (
          <StateTA title={t("empty")} description={t("myDescription")} />
        )}
      </section>
      <section>
        <h2 className="mb-5 text-xl font-semibold tracking-tight">
          {t("yours")}
        </h2>
        {data.memberships.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.memberships.map((membership) => {
              const terms = membership.plan_snapshot ?? membership.plan;
              const future = Date.parse(membership.starts_at) > Date.now();
              const expired = Date.parse(membership.ends_at) <= Date.now();
              const status =
                membership.status === "SUSPENDED"
                  ? "SUSPENDED"
                  : membership.status === "CANCELLED"
                    ? "CANCELLED"
                    : expired
                      ? "EXPIRED"
                      : future
                        ? "SCHEDULED"
                        : "ACTIVE";
              return (
                <article
                  key={membership.id}
                  className="rounded-3xl border border-border bg-card p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {membership.plan.business.name}
                    </p>
                    <span className="text-xs font-semibold text-primary">
                      {t(`membershipStatus.${status}`)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{terms.name}</h3>
                  <p className="mt-4 text-2xl font-semibold">
                    {t("remainingAppointments", {
                      count: membership.appointments_remaining,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("usedAppointments", {
                      count: membership.appointments_used,
                    })}
                  </p>
                  {Number(terms.discount_percentage) > 0 && (
                    <p className="mt-3 text-sm text-primary">
                      {t(
                        terms.appointments_included
                          ? "afterIncluded"
                          : "percentage",
                        {
                          amount: formatNumber(
                            Number(terms.discount_percentage),
                          ),
                        },
                      )}
                    </p>
                  )}
                  <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {t(future ? "starts" : "expires", {
                      date: formatDate(
                        future ? membership.starts_at : membership.ends_at,
                      ),
                    })}
                  </p>
                  {["ACTIVE", "SCHEDULED"].includes(status) && (
                    <div className="mt-5 space-y-2">
                      <ButtonTA
                        className="w-full"
                        variant="outline"
                        render={
                          <Link
                            to={`/cliente/business/${membership.plan.business_id}`}
                          />
                        }
                        nativeButton={false}
                      >
                        {t("visit")}
                      </ButtonTA>
                      <ButtonTA
                        className="w-full"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => select({ kind: "cancel", membership })}
                      >
                        {t("cancel")}
                      </ButtonTA>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <StateTA title={t("empty")} description={t("plansDescription")} />
        )}
      </section>
      <section className="overflow-hidden rounded-3xl border border-border">
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-2">
            <History className="size-4" />
            <h2 className="font-semibold">{t("history")}</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("historyDescription")} ·{" "}
            {t("points", { count: data.summary.points })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pointsNote")}
          </p>
        </div>
        {data.history.length ? (
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {data.history.map((entry) => (
              <div
                className="flex items-start justify-between gap-4 px-6 py-4"
                key={entry.id}
              >
                <div>
                  <p className="text-sm">{entry.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(entry.created_at)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {entry.amount > 0 ? "+" : ""}
                  {formatNumber(entry.amount)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {t(entry.unit === "STAMP" ? "stampUnit" : "pointUnit")}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <StateTA title={t("empty")} description={t("pointsNote")} />
        )}
      </section>
    </div>
  );
};
