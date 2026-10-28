import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { useOperationalDiagnostics } from "@/modules/analytics/health/useOperationalDiagnostics";

// COMPONENT
export const HealthOperationsTA = () => {
  // COMPOSABLES
  const { t, i18n } = useTranslation("health");
  const { data, request } = useOperationalDiagnostics();
  // HELPERS
  const timestamp = (value: string | null) =>
    value ? new Date(value).toLocaleString(i18n.language) : t("noEvidence");
  // RENDER
  return (
    <PanelTA
      title={t("operationalTitle")}
      description={t("operationalDescription")}
    >
      <div className="space-y-4 px-5 pb-5">
        <ButtonTA
          variant="outline"
          onClick={request.reload}
          disabled={request.loading}
        >
          {t("refresh")}
        </ButtonTA>
        {request.loading ? (
          <StateTA
            title={t("loading")}
            description={t("operationalDescription")}
          />
        ) : request.error ? (
          <StateTA
            error
            title={t("error")}
            description={t("operationalDescription")}
            onRetry={request.reload}
          />
        ) : (
          data && (
            <>
              <p className="text-xs text-muted-foreground">
                {t("observedAt", { date: timestamp(data.observed_at) })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.signals.map((signal) => (
                  <article
                    key={signal.name}
                    className="space-y-1 rounded-xl border border-border p-3 text-sm"
                  >
                    <h4 className="font-medium">
                      {t(`signals.${signal.name}`)}
                    </h4>
                    <p>
                      {t(`signalStates.${signal.status}`)}
                      {signal.stale && ` · ${t("staleSignal")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("lastSignal")}: {timestamp(signal.last_seen_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("lastSuccess")}: {timestamp(signal.last_succeeded_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("lastFailure")}: {timestamp(signal.last_failed_at)}
                    </p>
                  </article>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="space-y-2 rounded-xl border border-border p-3 text-sm">
                  <h4 className="font-medium">
                    {t("queueTitle")} · {data.queue.driver}
                  </h4>
                  <p>
                    {t("pendingJobs")}: {data.queue.pending ?? t("notMeasured")}
                  </p>
                  <p>
                    {t("reservedJobs")}:{" "}
                    {data.queue.reserved ?? t("notMeasured")}
                  </p>
                  <p>
                    {t("failedJobs")}: {data.queue.failed ?? t("notMeasured")}
                  </p>
                </article>
                <article className="space-y-2 rounded-xl border border-border p-3 text-sm">
                  <h4 className="font-medium">{t("outboxTitle")}</h4>
                  <p>
                    {t("pendingJobs")}: {data.outbox.pending} ·{" "}
                    {t("reservedJobs")}: {data.outbox.processing}
                  </p>
                  <p>
                    {t("failedJobs")}: {data.outbox.failed} ·{" "}
                    {t("deliveredJobs")}: {data.outbox.delivered}
                  </p>
                  <p>
                    {t("oldestPending")}:{" "}
                    {timestamp(data.outbox.oldest_pending_at)}
                  </p>
                </article>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.providers.map((provider) => (
                  <article
                    key={provider.name}
                    className="space-y-1 rounded-xl border border-border p-3 text-sm"
                  >
                    <h4 className="font-medium">
                      {t(`providers.${provider.name}`)}
                    </h4>
                    <p>
                      {provider.configured
                        ? t("configurationPresent")
                        : t("configurationIncomplete")}{" "}
                      · {provider.mode}
                    </p>
                    {provider.enabled !== null && (
                      <p>
                        {t(
                          provider.enabled
                            ? "deliveryEnabled"
                            : "deliveryDisabled",
                        )}
                      </p>
                    )}
                  </article>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("operationalLimits")}
              </p>
            </>
          )
        )}
      </div>
    </PanelTA>
  );
};
