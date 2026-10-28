import { formatWalletMoney as formatCurrency } from "@/modules/wallet/formatters";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3, RotateCw, LoaderCircle, ArrowUpRight } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { formatDate } from "@/i18n/formatters";
import { useWalletOrderActions } from "@/modules/wallet/composables/useWalletOrderActions";
import type { WalletActivityState } from "@/modules/wallet/types";

// COMPONENT
export const WalletOrdersTA = ({
  payments,
  reload,
}: {
  payments: WalletActivityState["payments"];
  reload: () => void;
}) => {
  const { t } = useTranslation("wallet");
  const returned = payments.returned;
  const { state, actions } = useWalletOrderActions(() => { reload(); payments.check(); });
  return (
    <>
      {(returned || payments.returnError) && (
        <section
          role="status"
          className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
        >
          <h2 className="flex items-center gap-2 font-semibold">
            {returned?.status === "APPROVED" ? (
              <CheckCircle2 className="size-5 text-primary" />
            ) : (
              <Clock3 className="size-5 text-primary" />
            )}
            {returned ? t(`statuses.${returned.status}`) : t("returnTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {returned ? t(`statusHelp.${returned.status}`) : t("returnError")}
          </p>
          <ButtonTA
            className="mt-3"
            variant="outline"
            disabled={payments.checking}
            onClick={payments.check}
          >
            {t("check")}
          </ButtonTA>
        </section>
      )}
      {(payments.orders.length > 0 || payments.error) && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t("topups")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("topupsHelp")}
              </p>
            </div>
            <ButtonTA
              variant="ghost"
              size="icon"
              aria-label={t("check")}
              onClick={reload}
            >
              <RotateCw className="size-4" />
            </ButtonTA>
          </div>
          {payments.error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {t("orderError")}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {payments.orders.map((order) => (
                <li key={order.id} className="space-y-2 rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">
                      {formatCurrency(Number(order.amount), order.currency)}
                    </p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${order.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : order.status === "PENDING" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {t(`statuses.${order.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(order.created_at)} · Wompi
                  </p>
                  <details className="text-[11px] text-muted-foreground"><summary className="cursor-pointer">{t("reference")}</summary><p className="mt-1 break-all">{order.reference}</p></details>
                  {order.checkout_url && (
                    <ButtonTA
                      variant="outline"
                      className="mt-2 w-full text-xs"
                      disabled={state.openingId !== null}
                      onClick={() => void actions.resume(order)}
                    >
                      {t("resume")}
                      {state.openingId === order.id ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" /> : <ArrowUpRight className="size-3.5" />}
                    </ButtonTA>
                  )}
                  {state.errorId === order.id && <p role="status" className="text-xs text-destructive">{t("checkoutError")}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
};
