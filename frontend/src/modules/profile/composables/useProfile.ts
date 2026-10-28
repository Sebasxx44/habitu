import { useRealtimeRevision } from '@/modules/realtime/useRealtimeRefresh';
import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { profileService } from "@/modules/profile/profileService";
import type { AccountProfile, ProfileState } from "@/modules/profile/types";
// COMPOSABLE
export const useProfile = (): ProfileState => {
  // STATE
  const { t, i18n } = useTranslation("profile");
  const { refreshUser } = useAuth();
  const { setTheme } = useTheme();
  const [data, setData] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [revision, refresh] = useState(0);
  const inFlight = useRef(false);
  const loaded = useRef(false);
  const realtimeRevision = useRealtimeRevision(["account", "users"], { enabled: !busy });
  // EFFECTS
  useEffect(() => {
    const controller = new AbortController();
    setLoading(!loaded.current);
    setError("");
    profileService
      .get(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) { loaded.current = true; setData(value); }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t("loadError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, realtimeRevision]);
  // ACTIONS
  const save = async (
    action: () => Promise<AccountProfile>,
  ): Promise<boolean> => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setSaveError("");
    setSaved(false);
    try {
      const value = await action();
      setData(value);
      setSaved(true);
      try {
        await refreshUser();
      } catch {
        setSaveError(t("refreshError"));
      }
      return true;
    } catch (failure) {
      setSaveError(
        isAxiosError<{ errors?: Record<string, string[]> }>(failure)
          ? (Object.values(failure.response?.data.errors ?? {}).flat()[0] ??
              t("saveError"))
          : t("saveError"),
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    account: {
      data,
      loading,
      error,
      reload: () => refresh((value) => value + 1),
    },
    changes: {
      busy,
      error: saveError,
      saved,
      contact: (input) => save(() => profileService.contact(input)),
      avatar: (file) => save(() => profileService.avatar(file)),
      removeAvatar: () => save(profileService.removeAvatar),
      email: (input) => save(() => profileService.email(input)),
      preferences: async (input) => {
        const result = await save(() => profileService.preferences(input));
        if (result) {
          setTheme(input.theme);
          await i18n.changeLanguage(input.language);
        }
        return result;
      },
    },
  };
};
