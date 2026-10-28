import { useState } from "react";
import { BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { useAvailabilityAlert } from "@/modules/marketplace/composables/useAvailabilityAlert";
import type { BookingRequest } from "@/composables/booking/types";

// COMPONENT
export const AvailabilityAlertTA = ({
  request,
}: {
  request: BookingRequest | null;
}) => {
  const { t } = useTranslation("marketplace");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { status, actions } = useAvailabilityAlert(request, from, to);
  if (!request) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
      {!status.active && (
        <div className="flex flex-wrap gap-3">
          <label className="min-w-0 flex-1 text-xs">
            {t("booking.from")}
            <InputTA
              type="time"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="min-w-0 flex-1 text-xs">
            {t("booking.to")}
            <InputTA
              type="time"
              min={from}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      )}
      {status.active && (
        <p role="status" className="text-sm text-primary">
          {t("booking.alertSaved")}
        </p>
      )}
      {status.failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("booking.alertError")}
        </p>
      )}
      <ButtonTA
        variant="outline"
        className="w-full"
        disabled={status.busy || (!!from && !!to && to <= from)}
        onClick={() =>
          void (status.active ? actions.cancel() : actions.subscribe())
        }
      >
        <BellRing className="size-4" />
        {t(status.active ? "booking.cancelAlert" : "booking.alert")}
      </ButtonTA>
    </div>
  );
};
