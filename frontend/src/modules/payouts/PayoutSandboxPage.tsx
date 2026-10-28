import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatMoney } from "@/modules/dashboard/formatters";
import { usePayoutWorkspace } from "@/modules/payouts/composables/usePayoutWorkspace";

// COMPONENT
export const PayoutSandboxPage = () => {
  const { t } = useTranslation("payouts");
  const { listing, actions } = usePayoutWorkspace();
  const data = listing.data;
  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        title={t("title")}
        description={t("description")}
        actions={
          <ButtonTA
            variant="outline"
            disabled={listing.loading}
            onClick={listing.refresh}
          >
            {t("refresh")}
          </ButtonTA>
        }
      />
      <p className="rounded-xl border border-border bg-muted p-4 text-sm">
        {t("productionOff")}
      </p>
      {listing.error && (
        <StateTA
          error
          title={listing.error}
          description={t("description")}
          onRetry={listing.refresh}
        />
      )}
      {listing.loading && !data && (
        <StateTA title={t("loading")} description={t("description")} />
      )}
      {actions.error && (
        <p role="alert" className="text-sm text-destructive">
          {actions.error}
        </p>
      )}
      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            {t(data.sandbox_enabled ? "enabled" : "disabled")}
          </p>
          {data.withdrawals.map((withdrawal) => {
            const attempt = data.attempts.find(
              (item) => item.withdrawal_id === withdrawal.id,
            );
            return (
              <PanelTA
                key={withdrawal.id}
                title={t("withdrawal", { id: withdrawal.id })}
                description={`${formatMoney(Number(withdrawal.amount))} COP · ${t("ledgerState")}: ${withdrawal.status}`}
              >
                <div className="space-y-3 px-5 pb-5">
                  {attempt ? (
                    <>
                      <p className="text-sm">
                        {t("testState")}: <strong>{attempt.state}</strong>
                      </p>
                      <p className="break-all text-xs text-muted-foreground">
                        {attempt.reference}
                      </p>
                      {attempt.resolution && (
                        <p className="text-xs text-muted-foreground">
                          {t(`resolution.${attempt.resolution}`, {
                            defaultValue: t("review"),
                          })}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {["READY", "UNCERTAIN"].includes(attempt.state) && (
                          <ButtonTA
                            disabled={
                              actions.busy ||
                              !data.sandbox_enabled ||
                              withdrawal.status !== "PENDING"
                            }
                            onClick={() => {
                              void actions.submit(attempt.id);
                            }}
                          >
                            {t("submit")}
                          </ButtonTA>
                        )}
                        {attempt.first_submitted_at &&
                          !["APPROVED", "FAILED"].includes(attempt.state) && (
                            <ButtonTA
                              variant="outline"
                              disabled={actions.busy || !data.sandbox_enabled}
                              onClick={() => {
                                void actions.reconcile(attempt.id);
                              }}
                            >
                              {t("reconcile")}
                            </ButtonTA>
                          )}
                      </div>
                    </>
                  ) : (
                    withdrawal.status === "PENDING" && (
                      <ButtonTA
                        disabled={actions.busy || !data.sandbox_enabled}
                        onClick={() => {
                          void actions.prepare(withdrawal.id);
                        }}
                      >
                        {t("prepare")}
                      </ButtonTA>
                    )
                  )}
                </div>
              </PanelTA>
            );
          })}
          {!data.withdrawals.length && (
            <StateTA title={t("empty")} description={t("description")} />
          )}
        </>
      )}
    </div>
  );
};
