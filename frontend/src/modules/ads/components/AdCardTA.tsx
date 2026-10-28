import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PanelTA } from "@/components/TA/PanelTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { formatCurrency, formatDate } from "@/i18n/formatters";
import type { AdRecord, AdsDirectoryState } from "@/modules/ads/types";

// COMPONENT
export const AdCardTA = ({
  ad,
  moderate,
  busy,
  actions,
  edit,
}: {
  ad: AdRecord;
  moderate: boolean;
  busy: boolean;
  actions: AdsDirectoryState["actions"];
  edit: (ad: AdRecord) => void;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("ads");
  // STATE
  const [reason, setReason] = useState("");
  return (
    <PanelTA
      title={ad.title}
      description={`${t(ad.status, { defaultValue: ad.status })} · ${t(ad.moderation_status, { defaultValue: ad.moderation_status })}`}
    >
      <div className="space-y-4 px-5 pb-5">
        {ad.description && <p className="text-sm">{ad.description}</p>}
        <p className="text-xs text-muted-foreground">
          {t("period", {
            from: formatDate(ad.start_date),
            to: formatDate(ad.end_date),
          })}
        </p>
        {ad.moderation_reason && (
          <p className="rounded-xl bg-secondary p-3 text-sm">
            {ad.moderation_reason}
          </p>
        )}
        <dl className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "impressions", value: ad.impressions_count },
            { label: "clicks", value: ad.clicks_count },
            { label: "completed", value: ad.completed_attributed_bookings },
            { label: "spent", value: formatCurrency(Number(ad.spent)) },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl bg-secondary/50 p-3">
              <dt className="text-xs text-muted-foreground">
                {t(metric.label)}
              </dt>
              <dd className="mt-1 text-lg font-semibold">{metric.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {ad.budget === null
            ? t("noBudget")
            : `${t("budget")}: ${formatCurrency(Number(ad.budget))}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonTA variant="outline" disabled={busy} onClick={() => edit(ad)}>
            {t("edit")}
          </ButtonTA>
          {ad.moderation_status === "APPROVED" && (
            <ButtonTA
              variant="outline"
              disabled={busy}
              onClick={() => void actions.status(ad)}
            >
              {t(ad.status === "ACTIVE" ? "pause" : "resume")}
            </ButtonTA>
          )}
          <ButtonTA
            variant="outline"
            disabled={busy}
            onClick={() => void actions.remove(ad.id)}
          >
            {t("remove")}
          </ButtonTA>
        </div>
        {moderate && (
          <div className="space-y-3 border-t border-border pt-4">
            <InputTA
              aria-label={t("reason")}
              placeholder={t("reason")}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <div className="flex gap-2">
              <ButtonTA
                disabled={busy}
                onClick={() => void actions.moderate(ad.id, "APPROVED", reason)}
              >
                {t("approve")}
              </ButtonTA>
              <ButtonTA
                variant="outline"
                disabled={busy || reason.trim().length < 5}
                onClick={() => void actions.moderate(ad.id, "REJECTED", reason)}
              >
                {t("reject")}
              </ButtonTA>
            </div>
          </div>
        )}
      </div>
    </PanelTA>
  );
};
