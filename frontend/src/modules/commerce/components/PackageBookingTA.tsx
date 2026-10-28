import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import {
  OperationFieldTA,
  OperationSelectTA,
} from "@/modules/operations/components/OperationFieldsTA";
import { formatCurrency, formatTime } from "@/i18n/formatters";
import { usePackageBooking } from "@/modules/commerce/composables/usePackageBooking";
import type { CommerceOption, ServicePackage } from "@/modules/commerce/types";

// COMPONENT
export const PackageBookingTA = ({
  item,
  branches,
}: {
  item: ServicePackage;
  branches: CommerceOption[];
}) => {
  // COMPOSABLES
  const { t } = useTranslation("commerce");
  const { booking, actions } = usePackageBooking(item.id, branches[0]?.id);
  const proposal = booking.proposal;
  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          void actions.preview();
        }}
      >
        <OperationFieldTA label={t("branch")}>
          <OperationSelectTA
            required
            disabled={booking.busy}
            value={booking.form.branchId}
            onChange={(event) =>
              actions.setField("branchId", event.target.value)
            }
          >
            {branches.map((branch) => (
              <option value={branch.id} key={branch.id}>
                {branch.name}
              </option>
            ))}
          </OperationSelectTA>
        </OperationFieldTA>
        <OperationFieldTA label={t("date")}>
          <InputTA
            required
            type="date"
            disabled={booking.busy}
            value={booking.form.date}
            onChange={(event) => actions.setField("date", event.target.value)}
          />
        </OperationFieldTA>
        <OperationFieldTA label={t("time")}>
          <InputTA
            required
            type="time"
            disabled={booking.busy}
            value={booking.form.startTime}
            onChange={(event) =>
              actions.setField("startTime", event.target.value)
            }
          />
        </OperationFieldTA>
        <p className="text-xs text-muted-foreground sm:col-span-3">
          {t("previewHelp")}
        </p>
        <ButtonTA type="submit" loading={booking.busy} disabled={booking.busy || !branches.length}>
          {t("preview")}
        </ButtonTA>
      </form>
      {booking.error && (
        <p role="alert" className="text-sm text-destructive">
          {booking.error}
        </p>
      )}
      {proposal && (
        <div className="space-y-4 rounded-xl bg-secondary/50 p-4">
          <p className="font-semibold">{t("proposal")}</p>
          <p className="text-xs text-muted-foreground">
            {t("expires", { time: formatTime(proposal.expires_at) })}
          </p>
          {proposal.snapshot.items.map((service, index) => (
            <article
              key={`${service.request.service_id}:${index}`}
              className="space-y-1 border-b border-border pb-3 text-sm"
            >
              <p className="font-medium">
                {index + 1}. {service.service_name} ·{" "}
                {formatCurrency(
                  service.quote.total,
                  proposal.snapshot.currency,
                )}
              </p>
              <p>
                {formatTime(service.request.start_time)} –{" "}
                {formatTime(service.end_time)}
                {service.quote.professional?.name
                  ? ` · ${service.quote.professional.name}`
                  : ""}
                {service.quote.resource?.name
                  ? ` · ${service.quote.resource.name}`
                  : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {service.terms.allow_cancellation
                  ? t("cancellation", {
                      minutes: service.terms.cancellation_notice_minutes,
                    })
                  : t("noCancellation")}
              </p>
              <p className="text-xs text-muted-foreground">
                {service.terms.allow_reschedule
                  ? t("reschedule", {
                      minutes: service.terms.reschedule_notice_minutes,
                    })
                  : t("noReschedule")}
              </p>
            </article>
          ))}
          <p className="font-semibold">
            {t("total")}:{" "}
            {formatCurrency(
              Number(proposal.snapshot.total),
              proposal.snapshot.currency,
            )}
          </p>
          {proposal.snapshot.cancellation_terms && (
            <p className="text-sm">{proposal.snapshot.cancellation_terms}</p>
          )}
          {proposal.status === "PREVIEW" && (
            <>
              <label className="flex items-start gap-3 text-sm">
                <InputTA
                  type="checkbox"
                  className="min-h-5 w-5 shrink-0"
                  checked={booking.accepted}
                  onChange={(event) =>
                    actions.setAccepted(event.target.checked)
                  }
                />
                {t("terms")}
              </label>
              <ButtonTA
                loading={booking.busy}
                disabled={
                  booking.busy ||
                  !booking.accepted ||
                  Date.parse(proposal.expires_at) <= Date.now()
                }
                onClick={() => void actions.confirm()}
              >
                {t("confirm")}
              </ButtonTA>
            </>
          )}
          {proposal.status === "CONFIRMED" && (
            <div role="status" className="space-y-2">
              <p className="text-sm text-primary">{t("confirmed")}</p>
              {proposal.appointments.map((appointment) => (
                <Link
                  className="block text-sm text-primary underline"
                  key={appointment.id}
                  to={`/cliente/appointments/${appointment.id}`}
                >
                  {t("booking", { code: appointment.booking_code })}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
