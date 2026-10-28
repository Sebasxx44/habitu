import { useTranslation } from "react-i18next";
import { Gift, TicketCheck } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { formatDate } from "@/i18n/formatters";
import { useGiftActions } from "@/modules/commerce/composables/useGiftActions";
import type { CommerceContext } from "@/modules/commerce/types";

// COMPONENT
export const GiftsTA = ({
  data,
  refresh,
}: {
  data: CommerceContext;
  refresh: () => void;
}) => {
  // COMPOSABLES
  const { t } = useTranslation("commerce");
  const { gifts, actions } = useGiftActions(data.business_id, refresh);
  return (
    <PanelTA title={t("gifts")} description={t("giftHelp")} icon={Gift} tone="accent">
      <div className="space-y-6 px-5 pb-5">
        {data.can_manage && (
          <form
            className="space-y-3 rounded-xl border border-primary/15 bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void actions.issue();
            }}
          >
            <p className="font-semibold">{t("issue")}</p>
            <p className="text-xs text-muted-foreground">{t("manualIssue")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <OperationFieldTA label={t("service")}>
                <OperationSelectTA
                  required
                  value={gifts.form.serviceId}
                  onChange={(event) =>
                    actions.setField("serviceId", event.target.value)
                  }
                >
                  <option value="">{t("selectService")}</option>
                  {data.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </OperationSelectTA>
              </OperationFieldTA>
              <OperationFieldTA label={t("expiresAt")}>
                <InputTA
                  required
                  type="date"
                  value={gifts.form.expiresAt}
                  onChange={(event) =>
                    actions.setField("expiresAt", event.target.value)
                  }
                />
              </OperationFieldTA>
            </div>
            <OperationFieldTA label={t("restrictions")}>
              <InputTA
                required
                minLength={10}
                maxLength={2000}
                value={gifts.form.restrictions}
                onChange={(event) =>
                  actions.setField("restrictions", event.target.value)
                }
              />
            </OperationFieldTA>
            <ButtonTA type="submit" loading={gifts.busy} disabled={gifts.busy}>
              {t("issue")}
            </ButtonTA>
          </form>
        )}
        <form
          className="space-y-3 rounded-2xl border border-primary/15 bg-card p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void (data.can_manage ? actions.redeem() : actions.claim());
          }}
        >
          {data.can_manage && (
            <p className="text-xs text-muted-foreground">{t("redeemHelp")}</p>
          )}
          <OperationFieldTA label={t("code")}>
            <InputTA
              required
              value={gifts.code}
              onChange={(event) => actions.setCode(event.target.value)}
            />
          </OperationFieldTA>
          {data.can_manage && (
            <OperationFieldTA label={t("appointmentId")}>
              <InputTA
                required
                type="number"
                min={1}
                value={gifts.appointmentId}
                onChange={(event) =>
                  actions.setAppointmentId(event.target.value)
                }
              />
            </OperationFieldTA>
          )}
          <ButtonTA type="submit" loading={gifts.busy} disabled={gifts.busy}>
            <TicketCheck className="size-4" />
            {t(data.can_manage ? "redeem" : "claim")}
          </ButtonTA>
        </form>
        {gifts.error && (
          <p role="alert" className="text-sm text-destructive">
            {gifts.error}
          </p>
        )}
        {gifts.result && (
          <div role="status" className="space-y-2 rounded-xl bg-primary/10 p-4">
            <p className="text-sm font-semibold">
              {t("giftUpdated")} · {gifts.result.snapshot.service_name}
            </p>
            <p className="select-all break-all font-mono text-xs">
              {gifts.result.code}
            </p>
            {data.can_manage && !gifts.result.claimed && (
              <p className="text-xs">{t("giftCodeHelp")}</p>
            )}
          </div>
        )}
        {!data.gifts.length && (
          <p className="text-sm text-muted-foreground">{t("noGifts")}</p>
        )}
        {data.gifts.map((gift) => (
          <article
            key={gift.id}
            className="space-y-3 rounded-2xl border border-primary/15 bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {gift.snapshot.service_name} · {gift.snapshot.business_name}
              </h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {t(gift.status, { defaultValue: gift.status })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("duration", { minutes: gift.snapshot.duration_minutes })} ·{" "}
              {t("expiry", { date: formatDate(gift.expires_at) })}
            </p>
            <p className="text-sm">{gift.snapshot.restrictions}</p>
            <p className="select-all break-all font-mono text-xs">
              {gift.code}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(gift.claimed ? "claimed" : "unclaimed")}
            </p>
            <details>
              <summary className="cursor-pointer text-xs text-primary">
                {t("history")}
              </summary>
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                {gift.events.map((event, index) => (
                  <li key={`${event.type}:${index}`}>
                    {t(event.type, { defaultValue: event.type })} ·{" "}
                    {formatDate(event.created_at)}
                  </li>
                ))}
              </ol>
            </details>
          </article>
        ))}
      </div>
    </PanelTA>
  );
};
