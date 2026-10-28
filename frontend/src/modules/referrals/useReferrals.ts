import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { httpService } from "@/services/auth/authService";
import type {
  ContactPreferences,
  ReferralState,
  ReferralSummary,
} from "@/modules/referrals/types";

// COMPOSABLE
export const useReferrals = (): ReferralState => {
  // STATE
  const [params] = useSearchParams();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [code, setCode] = useState(params.get("code") ?? "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [value, setValue] = useState<ContactPreferences>({
    promotions_enabled: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    contact_start: "09:00",
    contact_end: "20:00",
  });
  // ACTIONS
  const apply = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const response = await httpService.post<{ data: ReferralSummary }>(
        "/v2/referrals/apply",
        { code },
      );
      setData(response.data);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/cliente/referrals?code=${encodeURIComponent(data.code)}`,
      );
      setCopied(true);
    } catch {
      setError(true);
    }
  };
  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      const response = await httpService.put<{ data: ContactPreferences }>(
        "/v2/contact-preferences",
        value,
      );
      setValue(response.data);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // EFFECTS
  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      const results = await Promise.allSettled([
        httpService.get<{ data: ReferralSummary }>("/v2/referrals", {
          signal: abort.signal,
        }),
        httpService.get<{ data: ContactPreferences }>(
          "/v2/contact-preferences",
          { signal: abort.signal },
        ),
      ]);
      if (abort.signal.aborted) return;
      if (results[0].status === "fulfilled") setData(results[0].value.data);
      else setError(true);
      if (results[1].status === "fulfilled") setValue(results[1].value.data);
      else setError(true);
      setLoading(false);
    };
    void load();
    return () => abort.abort();
  }, []);
  // RETURN
  return {
    data,
    loading,
    busy,
    error,
    invitation: { code, setCode, copied, copy, apply },
    preferences: { value, setValue, save },
  };
};
