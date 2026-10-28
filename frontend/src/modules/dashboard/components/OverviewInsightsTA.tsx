import { t } from 'i18next'
import { currentLocale } from '@/i18n/formatters'
import { Gift, Check, Bell } from "lucide-react";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { statusLabel } from "@/modules/dashboard/formatters";
import type { DashboardOverview } from "@/modules/dashboard/types";

// COMPONENTS
export const StatusOverviewTA = ({ data }: { data: DashboardOverview }) => (
  <InteractiveChartTA
    title={t('dashboard.everyBooking')}
    description={t('dashboard.distribution')}
    data={data.statuses.map((row) => ({ label: statusLabel(row.status), values: { count: row.count } }))}
    series={[{ key: "count", label: t('dashboard.appointments') }]}
    initialType="pie"
    allowedTypes={["pie", "bar", "table"]}
    height={260}
  />
);

export const LoyaltyOverviewTA = ({ data }: { data: DashboardOverview }) => (
  <PanelTA
    title={t('dashboard.rewardsTitle')}
    icon={Gift}
    tone="accent"
    description={t('dashboard.loyaltySummary',{points:data.loyalty.points.toLocaleString(currentLocale()),rewards:data.loyalty.rewards})}
  >
    {data.loyalty.cards.length ? (
      <div className="space-y-5 px-5 pb-6 md:px-6">
        {data.loyalty.cards.slice(0, 3).map((card) => (
          <div key={card.id}>
            <div className="mb-3 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-secondary text-primary">
                <Gift className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{card.business}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {card.reward}
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums">
                {card.stamps}/{card.required}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label={t('dashboard.progress',{name:card.name})}
              aria-valuenow={Math.min(card.stamps, card.required)}
              aria-valuemin={0}
              aria-valuemax={card.required || 1}
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min((card.stamps / (card.required || 1)) * 100, 100)}%`,
                }}
              />
            </div>
            {card.available && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
                <Check className="size-3.5" />
                {t('dashboard.rewardReady')}
              </p>
            )}
          </div>
        ))}
      </div>
    ) : (
      <StateTA
        title={t('dashboard.visitsCount')}
        description={t('dashboard.loyaltyEmpty')}
      />
    )}
  </PanelTA>
);

export const ServicesOverviewTA = ({ data }: { data: DashboardOverview }) => (
  <InteractiveChartTA
    title={t('dashboard.topServices')}
    description={t('dashboard.realBookings')}
    data={data.services.map((service) => ({ label: service.name, values: { count: service.appointments } }))}
    series={[{ key: "count", label: t('dashboard.appointments') }]}
    initialType="bar"
    allowedTypes={["bar", "pie", "table"]}
    height={260}
  />
);

export const NoticesOverviewTA = ({ data }: { data: DashboardOverview }) => (
  <PanelTA
    title={t('dashboard.noticesTitle')}
    icon={Bell}
    description={t('dashboard.noticesDescription')}
  >
    {data.notices.length ? (
      <div className="space-y-4 px-5 pb-6 md:px-6">
        {data.notices.slice(0, 3).map((notice) => (
          <div key={notice.id} className="flex gap-3">
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${notice.read ? "bg-muted-foreground/40" : "bg-primary"}`}
            />
            <div>
              <p className="text-xs font-semibold">{notice.title}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {notice.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex items-start gap-3 px-5 pb-6 text-muted-foreground md:px-6">
        <Bell className="mt-0.5 size-4 shrink-0" />
        <p className="text-xs leading-relaxed">
          {t('dashboard.noNotices')}
        </p>
      </div>
    )}
  </PanelTA>
);
