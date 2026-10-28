import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useReservationCheckIn } from "@/modules/reservation-support/composables/useReservationCheckIn";
import { reservationSupportCopy } from "@/modules/reservation-support/copy";
import type {
  ReservationReference,
  ReservationSupport,
} from "@/modules/reservation-support/types";

// TYPES
interface CheckInProps {
  reference: ReservationReference;
  support: ReservationSupport;
  onVerified: () => Promise<void>;
}

// COMPONENT
export const ReservationCheckInTA = ({
  reference,
  support,
  onVerified,
}: CheckInProps) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  const { data, actions } = useReservationCheckIn(reference, onVerified);
  // STATE
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  // COMPUTED
  const copy =
    reservationSupportCopy[i18n.language.startsWith("en") ? "en" : "es"];
  const checked = Boolean(support.checked_in_at || data.verified);
  // RENDER
  return (
    <PanelTA title={copy.checkin} description={copy.pinHelp}>
      <div className="space-y-3 px-5 pb-5 md:px-6">
        {checked ? (
          <p role="status" className="text-sm font-medium">
            {copy.checked}
          </p>
        ) : (
          <>
            {support.can_issue_pin && (
              <ButtonTA
                onClick={() => void actions.issue()}
                disabled={
                  data.busy ||
                  Boolean(
                    data.issued &&
                    new Date(data.issued.expires_at).getTime() > Date.now(),
                  )
                }
              >
                {copy.issue}
              </ButtonTA>
            )}
            {data.issued && (
              <div role="status" className="rounded-xl bg-primary/10 p-4">
                <p className="text-3xl font-bold tracking-widest">
                  {data.issued.pin}
                </p>
                <p className="mt-1 text-xs">
                  {copy.expires}:{" "}
                  {new Date(data.issued.expires_at).toLocaleTimeString(
                    i18n.language,
                  )}
                </p>
              </div>
            )}
            {support.can_verify_pin && (
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void actions.verify(pin);
                }}
              >
                <InputTA
                  aria-label={copy.pin}
                  placeholder={copy.pin}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                  className="sm:w-48"
                />
                <ButtonTA
                  type="submit"
                  disabled={data.busy || pin.length !== 6}
                >
                  {copy.verify}
                </ButtonTA>
              </form>
            )}
            {support.can_manage && (
              <details>
                <summary className="cursor-pointer text-sm">
                  {copy.manualAction}
                </summary>
                <label className="mt-3 block text-sm">
                  {copy.manual}
                  <InputTA
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={10}
                    maxLength={1000}
                  />
                </label>
                <ButtonTA
                  className="mt-2"
                  variant="outline"
                  onClick={() => void actions.verify("", reason)}
                  disabled={data.busy || reason.trim().length < 10}
                >
                  {copy.manualAction}
                </ButtonTA>
              </details>
            )}
          </>
        )}
        {data.error && (
          <p role="alert" className="text-sm text-destructive">
            {data.error === "issue" ? copy.issueError : copy.verifyError}
          </p>
        )}
      </div>
    </PanelTA>
  );
};
