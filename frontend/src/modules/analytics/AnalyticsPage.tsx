import { useState } from "react";
import { MarketplaceHealthTA } from "@/modules/analytics/health/MarketplaceHealthTA";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { SkeletonTA } from "@/components/TA/SkeletonTA";
import { useAuth } from "@/contexts/AuthContext";
import { useAnalyticsOverview } from "@/modules/analytics/composables/useAnalyticsOverview";
import { AnalyticsFiltersTA } from "@/modules/analytics/components/AnalyticsFiltersTA";
import { AnalyticsMetricsTA } from "@/modules/analytics/components/AnalyticsMetricsTA";
import {
  AnalyticsDistributionTA,
  AnalyticsGrowthTA,
  AnalyticsTrendTA,
} from "@/modules/analytics/components/AnalyticsChartsTA";
import {
  AnalyticsGeographyTA,
  AnalyticsPerformanceTA,
  AnalyticsPromotionsTA,
} from "@/modules/analytics/components/AnalyticsTablesTA";
import { AnalyticsTelemetryTA } from "@/modules/analytics/components/AnalyticsTelemetryTA";
import { downloadAnalyticsCsv } from "@/modules/analytics/exports";
import { formatDate, formatNumber } from "@/i18n/formatters";

// COMPONENT
export const AnalyticsPage = ({
  businessId,
}: {
  businessId: number | null;
}) => {
  const { t } = useTranslation("analytics");
  const { user, permissions } = useAuth();
  const { overview, filters } = useAnalyticsOverview(businessId);
  const [tab, setTab] = useState("overview");
  const data = overview.data;
  const platform = businessId === null;
  const tabs = platform
    ? ["overview", "health", "growth", "operations", "acquisition", "marketplace"]
    : ["overview", "health", "operations", "acquisition"];
  const canExport =
    user?.role === "SUPERADMIN" || permissions.includes("reports.export");
  return (
    <div className="page-enter mx-auto min-w-0 max-w-7xl space-y-7 pb-8">
      {!platform && (
        <ButtonTA
          variant="ghost"
          className="-ml-3"
          render={
            <Link
              to={
                user?.role === "SUPERADMIN"
                  ? "/superadmin/businesses"
                  : "/admin/dashboard"
              }
            />
          }
          nativeButton={false}
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </ButtonTA>
      )}
      <ActionHeaderTA
        icon={TrendingUp}
        eyebrow={data?.scope.name ?? t("eyebrow")}
        title={t(platform ? "platformTitle" : "businessTitle")}
        description={t(
          platform ? "platformDescription" : "businessDescription",
        )}
        actions={
          <>
            <ButtonTA
              variant="outline"
              disabled={overview.loading}
              onClick={overview.refresh}
              aria-label={t("refresh")}
            >
              <RefreshCw className="size-4" />
            </ButtonTA>
            {canExport && (
              <ButtonTA
                variant="outline"
                disabled={!data || overview.loading}
                onClick={() => {
                  if (data) downloadAnalyticsCsv(data, (key) => t(key));
                }}
              >
                <Download className="size-4" />
                {t("export")}
              </ButtonTA>
            )}
          </>
        }
      />
      <AnalyticsFiltersTA
        filters={filters}
        currencies={data?.currencies ?? []}
      />
      <nav
        aria-label={t("eyebrow")}
        className="flex gap-1 overflow-x-auto rounded-2xl border border-primary/10 bg-primary/5 p-1.5"
      >
        {tabs.map((key) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
            className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-medium transition-colors ${tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-card hover:text-primary"}`}
          >
            {key === "health" ? t("health:title") : t(key)}
          </button>
        ))}
      </nav>
      {overview.error ? (
        <StateTA
          error
          title={t("loadError")}
          description={overview.error}
          onRetry={overview.refresh}
        />
      ) : overview.loading && !data ? (
        <SkeletonTA variant="dashboard" label={t("loading")} />
      ) : (
        data && (
          <>
            {tab === "health" && <MarketplaceHealthTA businessId={businessId} filters={filters.value} />}
            {tab === "overview" && (
              <div className="space-y-6">
                {data.platform && (
                  <AnalyticsMetricsTA
                    metrics={data.platform.metrics.slice(0, 6)}
                    currency={data.currency}
                  />
                )}
                <AnalyticsMetricsTA
                  metrics={data.metrics.slice(0, 8)}
                  currency={data.currency}
                />
                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
                  <AnalyticsTrendTA data={data} />
                  <AnalyticsTrendTA data={data} financial />
                </div>
                <AnalyticsMetricsTA
                  metrics={data.metrics.slice(8)}
                  currency={data.currency}
                />
                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
                  <AnalyticsDistributionTA
                    title={t("statuses")}
                    rows={data.statuses}
                    kind="status"
                  />
                  <AnalyticsDistributionTA
                    title={t("hours")}
                    rows={data.hours}
                  />
                  <AnalyticsDistributionTA
                    title={t("weekdays")}
                    rows={data.weekdays}
                    kind="weekday"
                  />
                </div>
              </div>
            )}
            {tab === "operations" && (
              <div className="space-y-6">
                <AnalyticsPerformanceTA
                  title={t("services")}
                  rows={data.services}
                  currency={data.currency}
                  service
                  conversion={data.telemetry.serviceConversion}
                />
                {data.scope.professionals && (
                  <AnalyticsPerformanceTA
                    professional
                    title={t("professionals")}
                    rows={data.professionals}
                    currency={data.currency}
                  />
                )}{" "}
                {data.scope.resources && (
                  <AnalyticsPerformanceTA
                    title={t("resources")}
                    rows={data.resources}
                    currency={data.currency}
                  />
                )}
                <AnalyticsPerformanceTA
                  title={t("branches")}
                  rows={data.branches}
                  currency={data.currency}
                />
                <AnalyticsPromotionsTA data={data} />
              </div>
            )}
            {tab === "growth" && data.platform && (
              <div className="space-y-6">
                <AnalyticsMetricsTA
                  metrics={data.platform.metrics}
                  currency={data.currency}
                />
                <AnalyticsGrowthTA data={data.platform.growth} />
                <AnalyticsGeographyTA data={data.platform.geography} />
                <PanelTA title={t("demographics")}>
                  <p className="px-5 pb-6 text-xs leading-relaxed text-muted-foreground sm:px-6">
                    {t(data.platform.demographics.reason)}
                  </p>
                </PanelTA>
              </div>
            )}
            {tab === "acquisition" && (
              <AnalyticsTelemetryTA data={data.telemetry} />
            )}
            {tab === "marketplace" && data.platform && (
              <div className="space-y-6">
                <PanelTA title={t("categories")} description={t("comparison")}>
                  {data.platform.categories.length ? (
                    <div className="divide-y divide-border">
                      {data.platform.categories.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
                        >
                          <span className="font-medium">{row.name}</span>
                          <div className="flex items-center gap-5 text-xs">
                            <span>
                              {formatNumber(row.reservations)}{" "}
                              {t("reservations")}
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="size-3.5" />
                              {row.change === null
                                ? "—"
                                : `${formatNumber(row.change, { maximumFractionDigits: 1 })}%`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <StateTA
                      title={t("empty")}
                      description={t("emptyDescription")}
                    />
                  )}
                </PanelTA>
                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
                  {[
                    {
                      title: "zeroResultCategories",
                      rows: data.telemetry.zeroResultCategories,
                    },
                    {
                      title: "searchedServices",
                      rows: data.telemetry.searchedServices,
                    },
                    {
                      title: "viewedServices",
                      rows: data.telemetry.viewedServices,
                    },
                  ].map((group) => (
                    <PanelTA
                      key={group.title}
                      title={t(group.title)}
                      description={t("searchPrivacy")}
                    >
                      {group.rows.length ? (
                        <div className="divide-y divide-border">
                          {group.rows.map((row) => (
                            <div
                              key={row.id}
                              className="flex justify-between gap-4 px-5 py-4 text-sm"
                            >
                              <span>{row.name}</span>
                              <span className="font-medium tabular-nums">
                                {formatNumber(row.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <StateTA
                          title={t("collecting")}
                          description={t("collectingDescription", {
                            count: data.telemetry.minimumGroup,
                          })}
                        />
                      )}
                    </PanelTA>
                  ))}
                </div>
              </div>
            )}
            <details className="rounded-2xl border border-border bg-card px-5 py-4">
              <summary className="cursor-pointer text-xs font-semibold">
                {t("limits")}
              </summary>
              <ul className="mt-4 list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
                {data.limitations.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </details>
            <p className="text-[11px] text-muted-foreground">
              {formatDate(data.period.start)} — {formatDate(data.period.end)} ·{" "}
              {t("timezone")}: {data.timezone} · {t("updated")}:{" "}
              {formatDate(data.generatedAt, {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </>
        )
      )}
    </div>
  );
};
export const BusinessAnalyticsPage = () => {
  const { id } = useParams();
  return <AnalyticsPage businessId={Number(id)} />;
};
export const PlatformAnalyticsPage = () => <AnalyticsPage businessId={null} />;
