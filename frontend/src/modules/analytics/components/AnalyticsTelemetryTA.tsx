import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { useTranslation } from "react-i18next";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatNumber } from "@/i18n/formatters";
import type { AnalyticsTelemetry } from "@/modules/analytics/types";

// COMPONENT
export const AnalyticsTelemetryTA = ({
  data,
}: {
  data: AnalyticsTelemetry;
}) => {
  const { t } = useTranslation("analytics");
  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-2">
      <PanelTA title={t("funnel")} description={t("funnelDescription")}>
        {data.available ? (
          <div>
            <InteractiveChartTA embedded title={t("funnel")} description={t("funnelDescription")} data={data.funnel.map((stage) => ({ label: t(`event.${stage.id}`), values: { sessions: stage.sessions } }))} series={[{ key: "sessions", label: t("funnel") }]} initialType="bar" allowedTypes={["bar", "line", "table"]} />
            <dl className="space-y-2 border-t border-border px-5 py-4 text-xs">
              {data.funnel.map((stage) => <div key={stage.id} className="flex items-center justify-between gap-4"><dt>{t(`event.${stage.id}`)} · {t("stepRate")}</dt><dd className="shrink-0 font-semibold tabular-nums">{stage.rate === null ? t("noData") : `${formatNumber(stage.rate, { maximumFractionDigits: 1 })}%`}</dd></div>)}
            </dl>
          </div>
        ) : (
          <StateTA
            title={t("collecting")}
            description={t("collectingDescription", {
              count: data.minimumGroup,
            })}
          />
        )}
      </PanelTA>
      <PanelTA
        title={t("assistantTitle")}
        description={t("assistantDescription")}
      >
        {data.assistantAvailable ? (
          <dl className="grid grid-cols-2 gap-px border-t border-border bg-border">
            {data.assistant.map((metric) => (
              <div key={metric.id} className="bg-card p-5">
                <dt className="text-xs text-muted-foreground">
                  {t(`event.${metric.id}`)}
                </dt>
                <dd className="mt-3 text-2xl font-semibold tabular-nums">
                  {formatNumber(metric.value ?? 0)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <StateTA
            title={t("collecting")}
            description={t("collectingDescription", {
              count: data.minimumGroup,
            })}
          />
        )}
      </PanelTA>
    </div>
  );
};
