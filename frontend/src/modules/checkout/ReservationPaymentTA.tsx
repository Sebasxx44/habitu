import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { bookingMoney } from "@/components/cliente/booking/BookingStepsTA";
import type { ReservationPaymentState } from "@/modules/checkout/types";

// COMPONENT
export const ReservationPaymentTA = ({
  payment,
  currency,
}: {
  payment: ReservationPaymentState;
  currency: string;
}) => {
  const { t } = useTranslation("checkout");
  if (payment.loading)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("loadingPolicy")}
      </p>
    );
  if (payment.error)
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 p-4">
        <p className="text-sm">{t("error")}</p>
        <ButtonTA variant="outline" onClick={payment.refresh}>
          {t("retry")}
        </ButtonTA>
      </div>
    );
  if (!payment.policy?.configured)
    return (
      <p className="rounded-xl bg-secondary p-4 text-xs text-muted-foreground">
        {t("legacy")}
      </p>
    );
  return (
    <fieldset className="space-y-4 rounded-2xl border border-border p-5">
      <legend className="px-2 text-sm font-semibold">{t("payment")}</legend>
      <div className="space-y-2">
        {payment.policy.allowed_modes.map((mode) => (
          <label
            key={mode}
            className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"
          >
            <input
              type="radio"
              name="booking-payment-mode"
              value={mode}
              checked={mode === payment.mode}
              disabled={
                mode !== "ON_SITE" && !payment.policy?.online_payments_enabled
              }
              onChange={() => payment.setMode(mode)}
            />
            {t(`modes.${mode}`)}
            {mode === "DEPOSIT" && ` · ${payment.policy?.deposit_percentage}%`}
          </label>
        ))}
      </div>
      {!payment.policy.online_payments_enabled &&
        payment.policy.allowed_modes.some((mode) => mode !== "ON_SITE") && (
          <p className="text-xs text-muted-foreground">
            {t("providerDisabled")}
          </p>
        )}
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>{t("payNow")}</dt>
          <dd className="font-semibold">
            {bookingMoney(payment.payNow, currency)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("payLater")}</dt>
          <dd>{bookingMoney(payment.payLater, currency)}</dd>
        </div>
      </dl>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
        {payment.policy.cancellation_terms}
      </p>
      <label className="flex items-start gap-3 text-sm">
        <input
          className="mt-1"
          type="checkbox"
          checked={payment.accepted}
          onChange={(event) => payment.setAccepted(event.target.checked)}
        />
        <span>{t("accept")}</span>
      </label>
      {payment.mode !== "ON_SITE" && (
        <p className="text-xs text-muted-foreground">
          {t("hold", { count: payment.policy.hold_minutes })}
        </p>
      )}
    </fieldset>
  );
};
