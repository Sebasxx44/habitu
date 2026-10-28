import { BellRing, CalendarDays, Clock3, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatDate, formatNumber, formatTime } from "@/i18n/formatters";
import { useAvailabilityAlerts } from "@/modules/marketplace/alerts/useAvailabilityAlerts";

// COMPONENT
export const AvailabilityAlertsTA = () => {
  const { t } = useTranslation("alerts");
  const { listing, cancellation } = useAvailabilityAlerts();

  return (
    <PanelTA
      title={t("title")}
      description={t("description")}
      action={
        <ButtonTA
          variant="ghost"
          disabled={listing.loading}
          onClick={listing.refresh}
          aria-label={t("refresh")}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
        </ButtonTA>
      }
    >
      {cancellation.completed && (
        <p role="status" className="px-5 pb-3 text-sm text-primary">
          {t("cancelled")}
        </p>
      )}
      {cancellation.failed && (
        <p role="alert" className="px-5 pb-3 text-sm text-destructive">
          {t("cancelError")}
        </p>
      )}
      {listing.loading ? (
        <div
          role="status"
          aria-label={t("loading")}
          className="space-y-3 px-5 pb-5"
        >
          <span className="sr-only">{t("loading")}</span>
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : listing.error ? (
        <StateTA
          error
          title={t("loadError")}
          description={t("loadErrorDescription")}
          onRetry={listing.refresh}
        />
      ) : !listing.items.length ? (
        <StateTA title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {listing.items.map((alert) => {
            const from = alert.preferred_date?.slice(0, 10);
            const to = alert.preferred_date_to?.slice(0, 10);
            const duration =
              alert.duration_minutes ?? alert.service?.duration_minutes;
            const serviceName = alert.service?.name ?? t("serviceFallback");
            return (
              <li
                key={alert.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{serviceName}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground">
                      <BellRing className="size-3" aria-hidden="true" />
                      {t(alert.status === "NOTIFIED" ? "notified" : "pending")}
                    </span>
                  </div>
                  {alert.business && (
                    <p className="text-xs text-muted-foreground">
                      {alert.business.name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {from ? formatDate(from) : t("anyDate")}
                      {to && to !== from ? ` — ${formatDate(to)}` : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3
                        className="size-3.5 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {alert.preferred_time_start
                        ? t("from", {
                            time: formatTime(alert.preferred_time_start),
                          })
                        : !alert.preferred_time_end
                          ? t("anyTime")
                          : ""}
                      {alert.preferred_time_end
                        ? ` ${t("until", { time: formatTime(alert.preferred_time_end) })}`
                        : ""}
                    </span>
                    {duration && (
                      <span>
                        {t("duration", { minutes: formatNumber(duration) })}
                      </span>
                    )}
                    {alert.participants > 1 && (
                      <span>{t("seats", { count: alert.participants })}</span>
                    )}
                  </div>
                  {(alert.branch || alert.resource || alert.professional) && (
                    <p className="text-xs text-muted-foreground">
                      {[
                        alert.branch
                          ? t("branch", { name: alert.branch.name })
                          : null,
                        alert.resource
                          ? t("resource", { name: alert.resource.name })
                          : null,
                        alert.professional
                          ? t("professional", { name: alert.professional.name })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {alert.status === "NOTIFIED" && (
                    <p className="max-w-xl text-xs text-muted-foreground">
                      {t("notifiedDescription")}
                    </p>
                  )}
                  {alert.expires_at && (
                    <p className="text-[11px] text-muted-foreground">
                      {t("expires", { date: formatDate(alert.expires_at) })}
                    </p>
                  )}
                </div>
                <ButtonTA
                  variant="outline"
                  className="shrink-0"
                  disabled={cancellation.pendingId !== null}
                  onClick={() => void cancellation.cancel(alert.id)}
                  aria-label={t("cancelFor", { service: serviceName })}
                >
                  {t(
                    cancellation.pendingId === alert.id
                      ? "cancelling"
                      : "cancel",
                  )}
                </ButtonTA>
              </li>
            );
          })}
        </ul>
      )}
    </PanelTA>
  );
};
