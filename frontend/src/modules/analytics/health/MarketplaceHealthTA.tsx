import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { useAuth } from "@/contexts/AuthContext";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { useMarketplaceHealth } from "@/modules/analytics/health/useMarketplaceHealth";
import { HealthOperationsTA } from "@/modules/analytics/health/HealthOperationsTA";
import { HealthClassificationTA } from "@/modules/analytics/health/HealthClassificationTA";
import type { HealthPanelProps } from "@/modules/analytics/health/types";

// COMPONENT
export const MarketplaceHealthTA = (props: HealthPanelProps) => {
  // COMPOSABLES
  const { t, i18n } = useTranslation("health");
  const { user } = useAuth();
  const { data, request, segments } = useMarketplaceHealth(props);
  // HELPERS
  const number = (value: number | null) =>
    value === null
      ? t("unavailable")
      : new Intl.NumberFormat(i18n.language, {
          maximumFractionDigits: 2,
        }).format(value);
  const money = (value: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: data?.currency ?? props.filters.currency,
    }).format(value);
  // RENDER
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <ButtonTA
          variant="outline"
          onClick={request.reload}
          disabled={request.loading}
        >
          {t("refresh")}
        </ButtonTA>
      </div>
      {request.loading ? (
        <StateTA title={t("loading")} description={t("description")} />
      ) : request.error ? (
        <StateTA
          error
          title={t("error")}
          description={t("description")}
          onRetry={request.reload}
        />
      ) : (
        data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <OperationFieldTA label={t("branchCity")}>
                <OperationSelectTA
                  value={segments.value.city}
                  onChange={(event) =>
                    segments.update("city", event.target.value)
                  }
                >
                  <option value="">{t("all")}</option>
                  {data.segments.cities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </OperationSelectTA>
              </OperationFieldTA>
              <OperationFieldTA label={t("category")}>
                <OperationSelectTA
                  value={segments.value.category}
                  onChange={(event) =>
                    segments.update("category", event.target.value)
                  }
                >
                  <option value="">{t("all")}</option>
                  {data.segments.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </OperationSelectTA>
              </OperationFieldTA>
              <OperationFieldTA label={t("hour")}>
                <OperationSelectTA
                  value={segments.value.hour}
                  onChange={(event) =>
                    segments.update("hour", event.target.value)
                  }
                >
                  <option value="">{t("all")}</option>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ))}
                </OperationSelectTA>
              </OperationFieldTA>
            </div>
            <p className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              {data.suppressed
                ? t("suppressed")
                : t("sample", {
                    count: data.sample ?? 0,
                    excluded: data.excluded ?? 0,
                  })}{" "}
              · {data.period.start} – {data.period.end} · {data.currency} ·{" "}
              {data.timezone}
            </p>
            {data.suppressed ? (
              <StateTA
                title={t("suppressed")}
                description={t("minimum", { count: data.minimum_group })}
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {data.metrics.map((metric) => (
                    <PanelTA
                      key={metric.id}
                      title={t(metric.id)}
                      description={t(`${metric.id}Definition`)}
                    >
                      <div className="space-y-2 px-5 pb-5">
                        <p className="text-2xl font-semibold">
                          {metric.value === null
                            ? t("unavailable")
                            : metric.unit === "currency"
                              ? money(metric.value)
                              : `${number(metric.value)}%`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {metric.numerator === null
                            ? t("denominator", { count: metric.denominator })
                            : `${metric.numerator} / ${metric.denominator}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("source")}: {metric.source}
                        </p>
                      </div>
                    </PanelTA>
                  ))}
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <PanelTA title={t("modalities")}>
                    <div className="space-y-2 px-5 pb-5">
                      {data.modalities.map((item) => (
                        <p
                          key={item.modality}
                          className="flex justify-between text-sm"
                        >
                          <span>{t(`models.${item.modality}`)}</span>
                          <span>
                            {item.numerator} / {item.denominator}
                          </span>
                        </p>
                      ))}
                    </div>
                  </PanelTA>
                  <PanelTA
                    title={t("cancellations")}
                    description={t("currentActorRole")}
                  >
                    <div className="space-y-2 px-5 pb-5">
                      {data.cancellations.map((item) => (
                        <p
                          key={item.responsible}
                          className="flex justify-between text-sm"
                        >
                          <span>{t(`responsible.${item.responsible}`)}</span>
                          <span>{item.count}</span>
                        </p>
                      ))}
                    </div>
                  </PanelTA>
                </div>
                <PanelTA
                  title={t("cohorts")}
                  description={t("cohortsDescription")}
                >
                  <div className="overflow-x-auto px-5 pb-5">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          {[
                            "month",
                            "cohortSize",
                            "eligible",
                            "returned",
                            "retention",
                          ].map((key) => (
                            <th key={key} className="p-2 font-medium">
                              {t(key)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.cohorts.map((row) => (
                          <tr
                            key={row.month}
                            className="border-t border-border"
                          >
                            <td className="p-2">{row.month}</td>
                            <td className="p-2">{number(row.sample)}</td>
                            <td className="p-2">{number(row.eligible)}</td>
                            <td className="p-2">{number(row.returned)}</td>
                            <td className="p-2">
                              {row.rate === null
                                ? t("unavailable")
                                : `${number(row.rate)}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PanelTA>
                {data.finance && (
                  <PanelTA
                    title={t("finance")}
                    description={t("financeDescription")}
                  >
                    <div className="grid gap-4 px-5 pb-5 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t("approval")}
                        </p>
                        <p className="font-semibold">
                          {number(data.finance.approval.rate)} ·{" "}
                          {data.finance.approval.numerator} /{" "}
                          {data.finance.approval.denominator}
                        </p>
                      </div>
                      {(["collected", "refunded"] as const).map((key) => (
                        <div key={key}>
                          <p className="text-xs text-muted-foreground">
                            {t(key)}
                          </p>
                          <p className="font-semibold">
                            {money(data.finance![key])}
                          </p>
                        </div>
                      ))}
                      {(
                        [
                          "aged_pending",
                          "unreconciled",
                          "refund_pending",
                          "refund_failed",
                          "payout_pending",
                          "payout_failed",
                        ] as const
                      ).map((key) => (
                        <div key={key}>
                          <p className="text-xs text-muted-foreground">
                            {t(key)}
                          </p>
                          <p className="font-semibold">
                            {number(data.finance![key])}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="px-5 pb-5 text-xs text-muted-foreground">
                      {t("source")}: {data.finance.source}
                    </p>
                  </PanelTA>
                )}
                {data.quality && (
                  <PanelTA
                    title={t("quality")}
                    description={t("qualityDescription")}
                  >
                    <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                      <p className="text-sm">
                        {t("incidentRate")}: {number(data.quality.rate)}% ·{" "}
                        {data.quality.affected} / {data.quality.denominator}
                      </p>
                      <p className="text-sm">
                        {t("resolutionTime")}:{" "}
                        {number(data.quality.mean_resolution_hours)} ·{" "}
                        {t("resolvedCases", { count: data.quality.resolved })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("source")}: {data.quality.source}
                      </p>
                    </div>
                  </PanelTA>
                )}
              </>
            )}
            <PanelTA title={t("definitions")}>
              <ul className="list-disc space-y-2 px-10 pb-5 text-xs text-muted-foreground">
                {data.limitations.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </PanelTA>
          </>
        )
      )}
      {user?.role === "SUPERADMIN" && (
        <>
          <HealthOperationsTA />
          <HealthClassificationTA refresh={request.reload} />
        </>
      )}
    </div>
  );
};
