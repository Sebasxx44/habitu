import { useTranslation } from 'react-i18next'
import { t } from 'i18next'
import { currentLocale } from '@/i18n/formatters'
import { ArrowUpRight, Download, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { DateRangeFilterTA } from "@/components/TA/DateRangeFilterTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import { DashboardHeroTA } from "@/modules/dashboard/components/DashboardHeroTA";
import { MetricsRowTA } from "@/modules/dashboard/components/MetricsRowTA";
import { ActivityChartTA } from "@/modules/dashboard/components/ActivityChartTA";
import { UpcomingAppointmentsTA } from "@/modules/dashboard/components/UpcomingAppointmentsTA";
import {
  LoyaltyOverviewTA,
  NoticesOverviewTA,
  ServicesOverviewTA,
  StatusOverviewTA,
} from "@/modules/dashboard/components/OverviewInsightsTA";
import { useDashboardOverview } from "@/modules/dashboard/composables/useDashboardOverview";
import type {
  DashboardOverview,
  DashboardRole,
} from "@/modules/dashboard/types";
import { PanelTA } from "@/components/TA/PanelTA";
import { formatDay, formatMoney } from "@/modules/dashboard/formatters";
import { visibleNavigation } from "@/components/TA/navigation";
import { HomePromotionsTA } from "@/modules/discovery/components/HomePromotionsTA";
import { HomeDiscoveryTA } from "@/modules/discovery/components/HomeDiscoveryTA";

// CONSTANTS
const roleConfig = (): Record<
  DashboardRole,
  {
    title: string;
    description: string;
    agenda: string;
    links: { label: string; path: string }[];
  }
> => ({
  SUPERADMIN: {
    title: t('dashboard.control'),
    description:
      t('dashboard.platformDescription'),
    agenda: "/superadmin/businesses",
    links: [
      { label: t('navigation.businesses'), path: "/superadmin/businesses" },
      { label: t('navigation.users'), path: "/superadmin/users" },
      { label: t('navigation.roles'), path: "/superadmin/roles" },
    ],
  },
  ADMIN_BARBERIA: {
    title: t('dashboard.businessTitle'),
    description: t('dashboard.businessDescription'),
    agenda: "/admin/appointments",
    links: [
      { label: t('navigation.calendar'), path: "/admin/calendar" },
      { label: t('navigation.professionals'), path: "/admin/professionals" },
      { label: t('navigation.loyalty'), path: "/admin/loyalty" },
      { label: t('navigation.reports'), path: "/admin/reports" },
    ],
  },
  PROFESSIONAL: {
    title: t('dashboard.professionalTitle'),
    description:
      t('dashboard.professionalDescription'),
    agenda: "/professional/appointments",
    links: [
      { label: t('navigation.myAppointments'), path: "/professional/appointments" },
      { label: t('navigation.earnings'), path: "/professional/earnings" },
      { label: t('navigation.queue'), path: "/admin/smart-queue" },
      { label: t('navigation.security'), path: "/professional/security" },
    ],
  },
  CLIENTE: {
    title: t('dashboard.clientTitle'),
    description: t('dashboard.clientDescription'),
    agenda: "/cliente/appointments",
    links: [
      { label: t('navigation.myAppointments'), path: "/cliente/appointments" },
      { label: t('navigation.favorites'), path: "/cliente/favorites" },
      { label: t('navigation.wallet'), path: "/cliente/wallet" },
      { label: t('navigation.memberships'), path: "/cliente/memberships" },
    ],
  },
});

// ACTIONS
const exportOverview = (data: DashboardOverview): void => {
  const rows = [
    [
      t('dashboard.date'),
      t('dashboard.appointments'),
      t('dashboard.completed'),
      t('dashboard.cancelled'),
      `Valor servicios (${data.currency})`,
    ],
    ...data.series.map((day) => [
      day.date,
      String(day.appointments),
      String(day.completed),
      String(day.cancelled),
      String(day.revenue),
    ]),
  ];
  const csv = "\uFEFF" + rows.map((row) => row.join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `habitu-${data.period.start}-${data.period.end}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// COMPONENT
export const DashboardPage = ({
  role,
  variant = "home",
}: {
  role: DashboardRole;
  variant?: "home" | "analytics";
}) => {
  useTranslation()
  const { user, permissions } = useAuth();
  const { overview, filters } = useDashboardOverview();
  const config = roleConfig()[role];
  const data = overview.data;
  const isClient = role === "CLIENTE";
  const name = user?.name?.split(" ")[0];
  const isAnalytics = variant === "analytics";
  const availablePaths = new Set(
    visibleNavigation(role, permissions).map((item) => item.path),
  );
  const canOpenAgenda = availablePaths.has(config.agenda);
  const heading = isAnalytics
    ? t('dashboard.perspective')
    : isClient && name
      ? `${config.title}, ${name}`
      : config.title;
  const date = new Intl.DateTimeFormat(currentLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: data?.timezone || "America/Bogota",
  }).format(new Date());

  return (
    <div className="dashboard-enter space-y-7">
      {isClient && !isAnalytics ? <HomeDiscoveryTA /> : <ActionHeaderTA
        eyebrow={isAnalytics ? t('dashboard.analyticsEyebrow') : date}
        title={heading}
        description={
          isAnalytics
            ? t('dashboard.analyticsDescription')
            : config.description
        }
        actions={
          <>
            <ButtonTA
              variant="outline"
              size="icon"
              onClick={overview.refresh}
              disabled={overview.loading}
              aria-label={t('dashboard.refresh')}
            >
              <RefreshCw className={overview.loading ? "animate-spin" : ""} />
            </ButtonTA>
            {!isClient && (
              <ButtonTA
                variant="outline"
                disabled={!data || overview.loading}
                onClick={() => {
                  if (data) exportOverview(data);
                }}
              >
                <Download />
                {t('dashboard.export')}
              </ButtonTA>
            )}
          </>
        }
      />}
      <section className="surface-card p-4 sm:p-5"><DateRangeFilterTA value={filters.range} onChange={filters.setRange} /></section>
      {overview.error ? (
        <div className="rounded-2xl border border-border bg-card">
          <StateTA
            error
            title={t('dashboard.loadError')}
            description={overview.error}
            onRetry={overview.refresh}
          />
        </div>
      ) : null}
      {!data && overview.loading && !overview.error ? (
        <DashboardSkeletonTA />
      ) : data && !overview.error ? (
        <>
          {!isAnalytics && !isClient && (
            <DashboardHeroTA
              data={data}
              agendaPath={config.agenda}
              canOpenAgenda={canOpenAgenda}
            />
          )}
          {isClient && !isAnalytics && <HomePromotionsTA />}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold">
                {isClient
                  ? t('dashboard.activityPerspective')
                  : t('dashboard.numbers')}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.comparison')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isClient && !isAnalytics && <ButtonTA variant="outline" size="icon" onClick={overview.refresh} disabled={overview.loading} aria-label={t('dashboard.refresh')}><RefreshCw className={overview.loading ? "animate-spin" : ""} /></ButtonTA>}
              {filters.currencies.length > 1 && (
                <label className="sr-only" htmlFor="dashboard-currency">
                  {t('dashboard.currency')}
                </label>
              )}
              {filters.currencies.length > 1 && (
                <select
                  id="dashboard-currency"
                  value={filters.currency || data.currency}
                  onChange={(event) => filters.setCurrency(event.target.value)}
                  className="min-h-11 rounded-xl border border-border bg-card px-3 text-xs"
                >
                  {filters.currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              )}

            </div>
          </div>
          <div
            className={`space-y-6 transition-opacity ${overview.loading ? "opacity-50" : ""}`}
            aria-busy={overview.loading}
          >
            <MetricsRowTA metrics={data.metrics} currency={data.currency} />
            <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <ActivityChartTA data={data} />
              </div>
              {isClient ? (
                <LoyaltyOverviewTA data={data} />
              ) : (
                <StatusOverviewTA data={data} />
              )}
            </div>
            <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                {isAnalytics ? (
                  <PanelTA
                    title={t('dashboard.daily')}
                    description={t('dashboard.dailyDescription')}
                  >
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-card text-muted-foreground">
                          <tr>
                            {[
                              t('dashboard.date'),
                              t('dashboard.appointments'),
                              t('dashboard.completed'),
                              t('dashboard.cancelled'),
                              t('dashboard.value',{currency:data.currency}),
                            ].map((label) => (
                              <th
                                key={label}
                                scope="col"
                                className="whitespace-nowrap border-b border-border px-5 py-3 font-medium"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.series.map((day) => (
                            <tr
                              key={day.date}
                              className="border-b border-border last:border-0"
                            >
                              <th
                                scope="row"
                                className="whitespace-nowrap px-5 py-3 font-medium"
                              >
                                {formatDay(day.date)}
                              </th>
                              <td className="px-5 py-3 tabular-nums">
                                {day.appointments}
                              </td>
                              <td className="px-5 py-3 tabular-nums">
                                {day.completed}
                              </td>
                              <td className="px-5 py-3 tabular-nums">
                                {day.cancelled}
                              </td>
                              <td className="whitespace-nowrap px-5 py-3 tabular-nums">
                                {formatMoney(day.revenue, data.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </PanelTA>
                ) : (
                  <UpcomingAppointmentsTA
                    data={data}
                    agendaPath={config.agenda}
                    canOpenAgenda={canOpenAgenda}
                  />
                )}
              </div>
              <div className="space-y-6">
                {isClient ? (
                  <NoticesOverviewTA data={data} />
                ) : (
                  <ServicesOverviewTA data={data} />
                )}
              </div>
            </div>
          </div>
          <nav
            aria-label={t('shared.shortcuts')}
            className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-5"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {t('shared.shortcuts')}
            </span>
            {config.links
              .filter((link) => availablePaths.has(link.path))
              .map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ))}
          </nav>
          <p className="text-[10px] text-muted-foreground">
            Actualizado a las{" "}
            {new Intl.DateTimeFormat(currentLocale(), {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: data.timezone,
            }).format(new Date(data.generatedAt))}{" "}
            · {data.timezone}
          </p>
        </>
      ) : null}
    </div>
  );
};
