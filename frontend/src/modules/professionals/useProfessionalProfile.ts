import { analyticsToday } from "@/modules/analytics/period";
import type { DateRangeValue } from "@/modules/analytics/dateRangeTypes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import { professionalsService } from "@/modules/professionals/professionalsService";
import type {
  ProfessionalDashboard,
  ProfessionalProfileReturn,
  ProfessionalRecord,
} from "@/modules/professionals/types";

// COMPOSABLE
export const useProfessionalProfile = (
  id: number,
  withAnalysis = true,
): ProfessionalProfileReturn => {
  // STATE
  const profileRequest = useRef(0);
  const analysisRequest = useRef(0);
  const [value, setValue] = useState<ProfessionalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(
    null,
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [currency, setCurrency] = useState("");
  const [preset, setPreset] = useState<DateRangeValue["preset"]>("custom");
  const [startDate, setStartDate] = useState(() => `${analyticsToday().slice(0, 7)}-01`);
  const [endDate, setEndDate] = useState(analyticsToday);
  const revision = useRealtimeRevision(["professionals", "appointments"]);
  const invalidRange = !startDate || !endDate || startDate > endDate;

  // SERVICES
  const reload = useCallback(async () => {
    const requestId = ++profileRequest.current;
    setLoading(true);
    setError("");
    try {
      const result = await professionalsService.find(id);
      if (requestId === profileRequest.current) setValue(result);
    } catch (reason) {
      if (requestId !== profileRequest.current) return;
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos cargar el profesional.",
      );
    } finally {
      if (requestId === profileRequest.current) setLoading(false);
    }
  }, [id]);
  const loadAnalysis = useCallback(async () => {
    const requestId = ++analysisRequest.current;
    if (invalidRange || !withAnalysis) return;
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const result = await professionalsService.dashboard(
        id,
        startDate,
        endDate,
        currency,
      );
      if (requestId === analysisRequest.current) setDashboard(result);
    } catch (reason) {
      if (requestId !== analysisRequest.current) return;
      setDashboard(null);
      setAnalysisError(
        reason instanceof Error
          ? reason.message
          : "No pudimos cargar la actividad.",
      );
    } finally {
      if (requestId === analysisRequest.current) setAnalysisLoading(false);
    }
  }, [id, startDate, endDate, currency, invalidRange, withAnalysis]);

  // LIFECYCLE
  useEffect(() => {
    void reload();
    return () => {
      profileRequest.current += 1;
    };
  }, [reload, revision]);
  useEffect(() => {
    void loadAnalysis();
    return () => {
      analysisRequest.current += 1;
    };
  }, [loadAnalysis, revision]);

  // RETURN
  return {
    profile: { value, loading, error, reload },
    analysis: {
      value: dashboard,
      loading: analysisLoading,
      error: analysisError,
      currency,
      setCurrency,
      range: { preset, start: startDate, end: endDate },
      setRange: (range) => { setPreset(range.preset); setStartDate(range.start); setEndDate(range.end); },
      reload: loadAnalysis,
      invalidRange,
    },
  };
};
