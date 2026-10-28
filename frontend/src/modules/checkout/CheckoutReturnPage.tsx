import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { bookingMoney } from "@/components/cliente/booking/BookingStepsTA";
import { useCheckoutReturn } from "@/modules/checkout/useCheckoutReturn";

// COMPONENT
export const CheckoutReturnPage = () => {
  const { t, i18n } = useTranslation("checkout");
  const { order, loading, busy, checking, error, refresh, pay, refund } =
    useCheckoutReturn();
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <ActionHeaderTA
        eyebrow="habitu"
        title={t("title")}
        description={t("description")}
      />
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm">
          {t("error")}
        </p>
      )}
      <ButtonTA variant="outline" onClick={refresh} disabled={checking || busy}>
        {t("retry")}
      </ButtonTA>
      {loading && <p role="status">{t("loadingPolicy")}</p>}
      {order && (
        <>
          <PanelTA
            title={t(`status.${order.status}`)}
            description={`${t("reference")}: ${order.reference}`}
          >
            <div className="space-y-4 px-5 pb-5">
              <p className="text-3xl font-bold tracking-tight">
                {bookingMoney(order.amount, order.currency)}
              </p>
              {order.status === "PENDING" && (
                <p className="text-sm text-muted-foreground">{t("pending")}</p>
              )}
              {order.status === "REVIEW" && (
                <p className="text-sm text-muted-foreground">{t("review")}</p>
              )}
              {order.resolution === "REFUND_REQUESTED" && (
                <p
                  role="status"
                  className="rounded-xl bg-secondary p-4 text-sm"
                >
                  {t("late")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("expires")}:{" "}
                {new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.expires_at))}
              </p>
              {order.snapshot && (
                <>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt>{t("payNow")}</dt>
                      <dd>
                        {bookingMoney(order.snapshot.pay_now, order.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>{t("payLater")}</dt>
                      <dd>
                        {bookingMoney(order.snapshot.pay_later, order.currency)}
                      </dd>
                    </div>
                  </dl>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {order.snapshot.cancellation_terms}
                  </p>
                </>
              )}
              <div className="flex flex-wrap gap-3">
                {order.checkout_url && order.status === "PENDING" && (
                  <ButtonTA
                    disabled={busy || checking}
                    onClick={() => void pay()}
                  >
                    {t("continue")}
                  </ButtonTA>
                )}
                {order.target_id && (
                  <ButtonTA
                    nativeButton={false}
                    variant="outline"
                    render={
                      <Link to={`/cliente/appointments/${order.target_id}`} />
                    }
                  >
                    {t("booking")}
                  </ButtonTA>
                )}
              </div>
            </div>
          </PanelTA>
          {(order.refunds?.length ?? 0) > 0 && (
            <PanelTA title={t("refunds")} description={t("refundNote")}>
              <ul className="space-y-3 px-5 pb-5">
                {order.refunds?.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border border-border p-4 text-sm"
                  >
                    <div className="flex justify-between gap-3">
                      <span>{t(`refundStatus.${item.status}`)}</span>
                      <strong>
                        {bookingMoney(item.amount, item.currency)}
                      </strong>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.reason}
                    </p>
                    {item.provider_reference && (
                      <p className="mt-2 text-xs">
                        {t("reference")}: {item.provider_reference}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </PanelTA>
          )}
          {order.status === "APPROVED" && order.resolution === "APPLIED" && (
            <PanelTA title={t("refundRequest")} description={t("refundRules")}>
              <form
                className="space-y-4 px-5 pb-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void refund.request();
                }}
              >
                <label className="block space-y-2 text-sm">
                  {t("amount")}
                  <InputTA
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={order.amount}
                    value={refund.amount}
                    onChange={(event) => refund.setAmount(event.target.value)}
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  {t("reason")}
                  <InputTA
                    required
                    minLength={5}
                    maxLength={1000}
                    value={refund.reason}
                    onChange={(event) => refund.setReason(event.target.value)}
                  />
                </label>
                <ButtonTA type="submit" disabled={busy}>
                  {t("refundRequest")}
                </ButtonTA>
              </form>
            </PanelTA>
          )}
        </>
      )}
    </main>
  );
};
