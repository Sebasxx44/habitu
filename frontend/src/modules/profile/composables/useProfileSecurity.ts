import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { profileService } from "@/modules/profile/profileService";
import type { ProfileSecurityState } from "@/modules/profile/types";
// COMPOSABLE
export const useProfileSecurity = (): ProfileSecurityState => {
  const { t } = useTranslation("profile");
  // STATE
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirmation: "",
    code: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  // ACTIONS
  const submit = async (): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await profileService.password({
        current_password: password.current,
        password: password.next,
        password_confirmation: password.confirmation,
        two_factor_code: password.code || undefined,
      });
      setPassword({ current: "", next: "", confirmation: "", code: "" });
      setSaved(true);
    } catch (failure) {
      setError(
        isAxiosError<{ errors?: Record<string, string[]> }>(failure)
          ? (Object.values(failure.response?.data.errors ?? {}).flat()[0] ??
              t("saveError"))
          : t("saveError"),
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    password,
    feedback: { busy, error, saved },
    actions: {
      update: (field, value) => {
        setPassword((current) => ({ ...current, [field]: value }));
        setSaved(false);
      },
      submit,
    },
  };
};
