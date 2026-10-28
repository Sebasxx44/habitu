import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { benefitsApi } from "@/modules/benefits/benefitsApi";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import { selectBookingBenefits } from "@/composables/booking/benefits";
import type {
  BenefitResponse,
  BenefitsCatalog,
} from "@/modules/benefits/types";
import type {
  BookingBenefitContext,
  BookingBenefitsState,
} from "@/composables/booking/benefitTypes";

// COMPOSABLE
export const useBookingBenefits = (
  context: BookingBenefitContext,
): BookingBenefitsState => {
  // STATE
  const revision = useRealtimeRevision(["benefits", "loyalty", "promotions"]);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<BenefitsCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const { businessId } = context;

  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    benefitsApi
      .catalog("", String(businessId), controller.signal)
      .then((catalog) => {
        if (!controller.signal.aborted) setData(catalog);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No pudimos actualizar tus beneficios.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId, revision, reload]);

  // ACTIONS
  const join = async (programId: number): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingId(programId);
    setEnrollmentError(null);
    try {
      await benefitsApi.join(programId);
      setReload((value) => value + 1);
    } catch (cause) {
      const response = isAxiosError<BenefitResponse<null>>(cause)
        ? cause.response?.data
        : undefined;
      setEnrollmentError(
        response?.message ||
          response?.error ||
          "No pudimos activar tu tarjeta.",
      );
    } finally {
      inFlight.current = false;
      setPendingId(null);
    }
  };

  return {
    catalog: { ...selectBookingBenefits(data, context), loading, error },
    enrollment: { pendingId, error: enrollmentError },
    actions: { reload: () => setReload((value) => value + 1), join },
  };
};
