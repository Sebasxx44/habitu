import { t } from 'i18next'
import { currentLocale } from '@/i18n/formatters'
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { formatMetric } from "@/modules/dashboard/formatters";
import type { DashboardMetric } from "@/modules/dashboard/types";

// COMPONENT
export const MetricsRowTA = ({
  metrics,
  currency,
}: {
  metrics: DashboardMetric[];
  currency: string;
}) => (
  <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
    {metrics.map((metric) => (
      <div key={metric.id} className="stat-card min-w-0 rounded-2xl border border-primary/10 p-4 sm:p-5 lg:p-6">
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {t(`dashboard.metrics.${metric.id}.label`,{defaultValue:metric.label})}
          <span
            tabIndex={0}
            className="group relative cursor-help rounded-full"
            aria-label={t(`dashboard.metrics.${metric.id}.description`,{defaultValue:metric.description})}
          >
            <Info className="size-3.5" aria-hidden="true" />
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-48 rounded-lg border border-border bg-popover p-3 text-xs font-normal leading-relaxed text-popover-foreground shadow-lg group-hover:block group-focus:block"
            >
              {t(`dashboard.metrics.${metric.id}.description`,{defaultValue:metric.description})}
            </span>
          </span>
        </dt>
        <dd className="mt-4 break-words text-[26px] font-semibold leading-none tracking-[-0.045em] tabular-nums xl:text-[32px]">
          {formatMetric(metric, currency)}
        </dd>
        <dd className="mt-3 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {metric.change !== null ? (
            <>
              <span className="inline-flex items-center font-medium text-foreground">
                {metric.change >= 0 ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {Math.abs(metric.change).toLocaleString(currentLocale(), {
                  maximumFractionDigits: 1,
                })}
                %
              </span>
              <span>{t('dashboard.previousPeriod')}</span>
            </>
          ) : (
            <span>{t('dashboard.noComparison')}</span>
          )}
        </dd>
      </div>
    ))}
  </dl>
);
