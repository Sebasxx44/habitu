import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Crown,
  Gift,
  RefreshCw,
  Search,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { ConfirmDialogTA } from "@/components/TA/ConfirmDialogTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { InputTA } from "@/components/TA/InputTA";
import { useBenefitsCatalog } from "@/modules/benefits/composables/useBenefitsCatalog";
import { useBenefitActions } from "@/modules/benefits/composables/useBenefitActions";
import { useMembershipPayment } from "@/modules/benefits/composables/useMembershipPayment";
import { PromotionOfferTA } from "@/modules/benefits/components/PromotionOfferTA";
import { LoyaltyBenefitTA } from "@/modules/benefits/components/LoyaltyBenefitTA";
import { MembershipOfferTA } from "@/modules/benefits/components/MembershipOfferTA";
import { MyBenefitsTA } from "@/modules/benefits/components/MyBenefitsTA";
import type { BenefitsTab } from "@/modules/benefits/types";

// CONFIGURATION
const tabs: BenefitsTab[] = [
  "all",
  "promotions",
  "loyalty",
  "memberships",
  "mine",
];
// VIEW
export const BenefitsPage = ({
  initialTab = "all",
}: {
  initialTab?: BenefitsTab;
}) => {
  const { t } = useTranslation("benefits");
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = tabs.find((value) => value === requested) ?? initialTab;
  const { catalog, filters } = useBenefitsCatalog(
    params.get("business_id") ?? "",
  );
  const { mutation, actions } = useBenefitActions(catalog.refresh);
  const payment = useMembershipPayment(params.get("checkout"), catalog.refresh);
  const data = catalog.data;
  const changeTab = (value: BenefitsTab) =>
    setParams((current) => {
      current.set("tab", value);
      return current;
    });
  const visible = (value: BenefitsTab) => tab === "all" || tab === value;
  const selected = mutation.selected;
  const confirmations =
    selected?.kind === "redeem"
      ? { count: selected.program.required, reward: selected.program.reward }
      : {};
  const pending = mutation.pending || payment.payment.pending;
  const order = payment.payment.order;
  const orderMessage =
    order && ["APPROVED", "COMPLETED"].includes(order.status)
      ? "payment.approved"
      : order &&
          ["DECLINED", "VOIDED", "ERROR", "EXPIRED"].includes(order.status)
        ? "payment.failed"
        : order?.status === "REVIEW"
          ? "payment.review"
          : "payment.pending";
  const empty =
    !data ||
    (tab === "promotions"
      ? !data.promotions.length
      : tab === "loyalty"
        ? !data.programs.length
        : tab === "memberships"
          ? !data.plans.length
          : tab === "all"
            ? !data.promotions.length &&
              !data.programs.length &&
              !data.plans.length
            : false);
  return (
    <div className="page-enter space-y-8 pb-10">
      <ActionHeaderTA
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            variant="outline"
            disabled={catalog.loading}
            onClick={catalog.refresh}
          >
            <RefreshCw className={catalog.loading ? "animate-spin" : ""} />
            {t("refresh")}
          </ButtonTA>
        }
      />
      <section className="relative overflow-hidden rounded-3xl bg-primary p-4 text-primary-foreground md:p-8">
        <Sparkles className="pointer-events-none absolute -right-8 -top-10 size-60 rotate-12 opacity-[0.06]" />
        <div className="relative grid grid-cols-3 gap-2 md:gap-6">
          {[
            {
              icon: Gift,
              count: data?.summary.ready_rewards,
              label: "ready",
              target: "loyalty",
            },
            {
              icon: Crown,
              count: data?.summary.active_memberships,
              label: "activePlans",
              target: "mine",
            },
            {
              icon: TicketPercent,
              count: data?.summary.available_vouchers,
              label: "vouchers",
              target: "mine",
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => changeTab(item.target as BenefitsTab)}
              className="flex min-w-0 items-center gap-4 rounded-xl p-2 text-left outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
            >
              <item.icon className="hidden size-6 shrink-0 opacity-70 md:block" />
              <div>
                <p className="text-2xl font-semibold tabular-nums md:text-3xl">
                  {item.count ?? "—"}
                </p>
                <p className="mt-1 text-[10px] leading-relaxed opacity-80 md:text-xs">
                  {t(item.label)}
                </p>
              </div>
              <ArrowRight className="ml-auto hidden size-4 shrink-0 opacity-70 md:block" />
            </button>
          ))}
        </div>
      </section>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav
          className="flex gap-2 overflow-x-auto pb-1"
          aria-label={t("title")}
        >
          {tabs.map((value) => (
            <ButtonTA
              key={value}
              variant={tab === value ? "default" : "outline"}
              aria-pressed={tab === value}
              className="shrink-0 rounded-full"
              onClick={() => changeTab(value)}
            >
              {t(`tabs.${value}`)}
            </ButtonTA>
          ))}
        </nav>
        {tab !== "mine" && (
          <div className="relative lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <InputTA
              className="pl-9"
              value={filters.search}
              onChange={(event) => filters.setSearch(event.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
            />
          </div>
        )}
      </div>
      {filters.businessId && (
        <ButtonTA
          variant="ghost"
          onClick={() => {
            filters.setBusinessId("");
            setParams((current) => {
              current.delete("business_id");
              return current;
            });
          }}
        >
          {t("clear")}
        </ButtonTA>
      )}
      {mutation.success && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"
        >
          <p>{mutation.success}</p>
          <ButtonTA variant="ghost" onClick={() => changeTab("mine")}>
            {t("tabs.mine")}
            <ArrowRight />
          </ButtonTA>
        </div>
      )}
      {(order || payment.payment.error) && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">{t("payment.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground" role="status">
            {payment.payment.error ?? t(orderMessage)}
          </p>
          <ButtonTA
            variant="outline"
            className="mt-4"
            disabled={payment.payment.pending}
            onClick={() => {
              void payment.actions.refresh();
            }}
          >
            {t("payment.refresh")}
          </ButtonTA>
        </section>
      )}
      {catalog.error ? (
        <StateTA
          error
          title={t("loadError")}
          description={catalog.error}
          onRetry={catalog.refresh}
        />
      ) : catalog.loading ? (
        <DashboardSkeletonTA />
      ) : (
        data && (
          <div className="space-y-12">
            {empty && (
              <StateTA title={t("empty")} description={t("emptyDescription")} />
            )}
            {visible("promotions") && !!data.promotions.length && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight">
                  {t("offersTitle")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("offersDescription")}
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.promotions.map((offer) => (
                    <PromotionOfferTA key={offer.id} offer={offer} />
                  ))}
                </div>
              </section>
            )}
            {visible("loyalty") && !!data.programs.length && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight">
                  {t("loyaltyTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {t("loyaltyDescription")}
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.programs.map((program) => (
                    <LoyaltyBenefitTA
                      key={program.id}
                      program={program}
                      pending={pending}
                      select={actions.select}
                    />
                  ))}
                </div>
              </section>
            )}
            {visible("memberships") && !!data.plans.length && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight">
                  {t("plansTitle")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("plansDescription")}
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.plans.map((plan) => (
                    <MembershipOfferTA
                      key={plan.id}
                      plan={plan}
                      active={data.memberships.some(
                        (membership) =>
                          membership.membership_plan_id === plan.id &&
                          membership.status === "ACTIVE" &&
                          Date.parse(membership.ends_at) > Date.now(),
                      )}
                      pending={pending}
                      checkoutEnabled={
                        !!payment.payment.config?.enabled &&
                        Number(plan.price) >=
                          payment.payment.config.min_amount &&
                        Number(plan.price) <= payment.payment.config.max_amount
                      }
                      select={actions.select}
                      pay={payment.actions.start}
                    />
                  ))}
                </div>
              </section>
            )}
            {tab === "mine" && (
              <MyBenefitsTA
                data={data}
                pending={pending}
                select={actions.select}
              />
            )}
          </div>
        )
      )}
      <ConfirmDialogTA
        open={!!selected}
        title={selected ? t(`confirm.${selected.kind}`) : ""}
        description={
          selected
            ? t(`confirmDescription.${selected.kind}`, confirmations)
            : ""
        }
        confirmLabel={t("confirmAction")}
        busy={mutation.pending}
        error={mutation.error}
        onClose={actions.close}
        onConfirm={() => {
          void actions.confirm();
        }}
      />
    </div>
  );
};
