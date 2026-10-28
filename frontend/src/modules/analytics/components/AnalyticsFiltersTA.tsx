import { useTranslation } from "react-i18next";
import { DateRangeFilterTA } from "@/components/TA/DateRangeFilterTA";
import type { AnalyticsGrain, AnalyticsState } from "@/modules/analytics/types";

// COMPONENT
export const AnalyticsFiltersTA = ({ filters, currencies }: {
  filters: AnalyticsState["filters"];
  currencies: string[];
}) => {
  const { t } = useTranslation("analytics");
  return (
    <section aria-label={t("period")} className="surface-card space-y-5 p-4 sm:p-5">
      <DateRangeFilterTA value={filters.value} onChange={filters.setRange} />
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("grain")}
          <select aria-label={t("grain")} value={filters.value.grain} onChange={(event) => filters.update("grain", event.target.value as AnalyticsGrain)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-foreground">
            {(["day", "week", "month", "quarter", "year"] as const).map((grain) => <option value={grain} key={grain}>{t(grain === "year" ? "yearGrain" : grain)}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t("currency")}
          <select aria-label={t("currency")} value={filters.value.currency} onChange={(event) => filters.update("currency", event.target.value)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-foreground">
            {[...new Set([filters.value.currency, ...currencies])].map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
};
