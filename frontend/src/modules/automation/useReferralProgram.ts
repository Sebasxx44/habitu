import { useEffect, useState } from "react";
import { httpService } from "@/services/auth/authService";
import type {
  ReferralProgramForm,
  ReferralProgramRecord,
  ReferralProgramState,
} from "@/modules/automation/types";

// COMPOSABLE
export const useReferralProgram = (
  businessId: number,
  currency: string,
): ReferralProgramState => {
  // STATE
  const [value, setValue] = useState<ReferralProgramForm>({
    enabled: false,
    reward: 0,
    minimum_paid: 0,
    currency,
    validity_days: 30,
    qualification_days: 30,
    terms: "",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    void httpService
      .get<{
        data: { program: ReferralProgramRecord | null; currency: string };
      }>(`/v2/referrals/programs/${businessId}`, { signal: controller.signal })
      .then((response) => {
        const program = response.data.program;
        if (!controller.signal.aborted) {
          if (program)
            setValue({
              ...program,
              reward: program.reward_minor / 100,
              minimum_paid: program.minimum_paid_minor / 100,
            });
          else
            setValue((current) => ({
              ...current,
              currency: response.data.currency,
            }));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [businessId]);
  // ACTIONS
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setError(false);
    try {
      await httpService.put(`/v2/referrals/programs/${businessId}`, value);
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // RETURN
  return {
    form: {
      value,
      setValue: (update) => {
        setSaved(false);
        setValue(update);
      },
      save,
    },
    request: { loading, busy, error, saved },
  };
};
