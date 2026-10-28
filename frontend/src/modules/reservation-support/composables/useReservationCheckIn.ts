import { useState } from "react";
import { reservationSupportService } from "@/modules/reservation-support/service";
import type {
  CheckInState,
  ReservationPin,
  ReservationReference,
} from "@/modules/reservation-support/types";

// COMPOSABLE
export const useReservationCheckIn = (
  reference: ReservationReference,
  onVerified: () => Promise<void>,
): CheckInState => {
  // STATE
  const [issued, setIssued] = useState<ReservationPin | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  // ACTIONS
  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      setIssued(await reservationSupportService.issue(reference));
    } catch {
      setError("issue");
    } finally {
      setBusy(false);
    }
  };
  const verify = async (pin: string, reason?: string) => {
    setBusy(true);
    setError(null);
    try {
      await reservationSupportService.verify(reference, pin, reason);
      setVerified(true);
      await onVerified();
    } catch {
      setError("verify");
    } finally {
      setBusy(false);
    }
  };
  // RETURN
  return {
    data: { issued, busy, error, verified },
    actions: { issue, verify },
  };
};
