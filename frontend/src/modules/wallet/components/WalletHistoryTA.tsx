import { formatWalletMoney as formatCurrency } from "@/modules/wallet/formatters";
import { useTranslation } from "react-i18next";
import { ArrowDownLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { formatDate, formatTime, formatNumber } from "@/i18n/formatters";
import type {
  WalletActivityState,
  WalletFilters,
} from "@/modules/wallet/types";

// CONSTANTS
const kinds: WalletFilters["type"][] = [
  "",
  "CREDIT",
  "DEBIT",
  "CASHBACK",
  "REFUND",
  "PAYOUT",
];
// COMPONENT
export const WalletHistoryTA = ({
  history,
  currency,
  reload,
}: {
  history: WalletActivityState["history"];
  currency: string;
  reload: () => void;
}) => {
  const { t } = useTranslation("wallet");
  return (
    <section
      className="surface-card min-w-0 rounded-2xl border border-border bg-card"
      aria-labelledby="wallet-history-title"
    >
      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="wallet-history-title"
            className="text-xl font-semibold tracking-tight"
          >
            {t("history")}
          </h2>
          <span className="text-xs text-muted-foreground">
            {t("records", { count: history.page.total })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t("historyHelp")}</p>
        <div className="flex flex-wrap gap-3">
          <label className="min-w-40 flex-1 text-xs font-medium">
            {t("type")}
            <select
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              value={history.filters.type}
              onChange={(event) =>
                history.change({
                  type: event.target.value as WalletFilters["type"],
                })
              }
            >
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {t(kind ? `types.${kind}` : "all")}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-32 flex-1 text-xs font-medium">
            {t("from")}
            <InputTA
              className="mt-2"
              type="date"
              max={history.filters.to || undefined}
              value={history.filters.from}
              onChange={(event) => history.change({ from: event.target.value })}
            />
          </label>
          <label className="min-w-32 flex-1 text-xs font-medium">
            {t("to")}
            <InputTA
              className="mt-2"
              type="date"
              min={history.filters.from || undefined}
              value={history.filters.to}
              onChange={(event) => history.change({ to: event.target.value })}
            />
          </label>
        </div>
        {(history.filters.type ||
          history.filters.from ||
          history.filters.to) && (
          <ButtonTA
            variant="ghost"
            size="sm"
            onClick={() => history.change({ type: "", from: "", to: "" })}
          >
            {t("clear")}
          </ButtonTA>
        )}
      </div>
      {history.loading ? (
        <SkeletonTA variant="list" count={3} label={t("loading")} className="px-6 pb-6" />
      ) : history.error ? (
        <StateTA
          error
          title={t("historyError")}
          description={t("errorHelp")}
          onRetry={reload}
        />
      ) : !history.page.data.length ? (
        <StateTA
          title={t(
            history.filters.type || history.filters.from || history.filters.to
              ? "noResults"
              : "empty",
          )}
          description={t("emptyHelp")}
        />
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {history.page.data.map((transaction) => {
            const debit = transaction.type === "DEBIT";
            const Icon = debit ? ArrowUpRight : ArrowDownLeft;
            return (
              <details key={transaction.id} className="group px-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-start gap-3 py-5 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <span
                    className={`mt-1 grid size-9 shrink-0 place-items-center rounded-xl ${debit ? "bg-muted text-foreground" : "bg-primary/10 text-primary"}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {t(`types.${transaction.type}`)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {transaction.description || t("transaction")}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {formatDate(transaction.created_at)} ·{" "}
                      {formatTime(transaction.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold tabular-nums ${debit ? "" : "text-primary"}`}
                    >
                      {debit ? "−" : "+"}
                      {formatCurrency(Number(transaction.amount), currency)}
                    </p>
                    <ChevronDown className="ml-auto mt-3 size-3.5 text-muted-foreground group-open:rotate-180" />
                    <span className="sr-only">{t("details")}</span>
                  </div>
                </summary>
                <dl className="grid gap-3 border-t border-dashed border-border py-4 text-xs sm:grid-cols-2">
                  {[
                    [
                      t("before"),
                      transaction.balance_before == null
                        ? null
                        : formatCurrency(
                            Number(transaction.balance_before),
                            currency,
                          ),
                    ],
                    [
                      t("after"),
                      transaction.balance_after == null
                        ? null
                        : formatCurrency(
                            Number(transaction.balance_after),
                            currency,
                          ),
                    ],
                    [t("method"), transaction.payment_method],
                    [
                      t("reference"),
                      transaction.external_reference ?? `#${transaction.id}`,
                    ],
                  ]
                    .filter(([, value]) => value != null)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="mt-1 break-all font-medium">{value}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            );
          })}
        </div>
      )}
      {history.page.last_page > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-border p-4">
          <ButtonTA
            variant="outline"
            disabled={history.loading || history.page.current_page <= 1}
            onClick={() => history.goTo(history.page.current_page - 1)}
          >
            {t("previous")}
          </ButtonTA>
          <span className="text-xs text-muted-foreground">
            {t("page", {
              page: formatNumber(history.page.current_page),
              total: formatNumber(history.page.last_page),
            })}
          </span>
          <ButtonTA
            variant="outline"
            disabled={
              history.loading ||
              history.page.current_page >= history.page.last_page
            }
            onClick={() => history.goTo(history.page.current_page + 1)}
          >
            {t("next")}
          </ButtonTA>
        </div>
      )}
    </section>
  );
};
