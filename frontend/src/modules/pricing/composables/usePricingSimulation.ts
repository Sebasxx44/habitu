import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { discoveryDay } from "@/modules/discovery/query";
import { pricingService } from "@/modules/pricing/pricingService";
import type {
  PricingContext,
  PricingSimulation,
  PricingSimulationState,
} from "@/modules/pricing/types";
// COMPOSABLE
export const usePricingSimulation = (
  context: PricingContext | null,
): PricingSimulationState => {
  // STATE
  const { t } = useTranslation("pricing");
  const [form, setForm] = useState({
    serviceId: "",
    branchId: "",
    date: discoveryDay(1),
    duration: 30,
    participants: 1,
  });
  const [result, setResult] = useState<{
    key: string;
    data: PricingSimulation;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const key = JSON.stringify([context?.business?.id, form]);
  const service = context?.business?.services.find(
    (item) => item.id === Number(form.serviceId),
  );
  // EFFECTS
  useEffect(() => {
    setForm((current) => ({
      ...current,
      serviceId: String(context?.business?.services[0]?.id ?? ""),
      branchId: String(context?.business?.branches[0]?.id ?? ""),
      duration: context?.business?.services[0]?.duration_minutes ?? 30,
      participants: 1,
    }));
    setResult(null);
    setError("");
  }, [context?.business?.id]);
  // ACTIONS
  const run = async (): Promise<void> => {
    if (!context?.business || !service || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await pricingService.simulate({
        business_id: context.business.id,
        service_id: Number(form.serviceId),
        branch_id: Number(form.branchId),
        date: form.date,
        duration_minutes: form.duration,
        participants: form.participants,
      });
      setResult({ key, data });
    } catch (failure) {
      setError(
        isAxiosError<{ errors?: Record<string, string[]> }>(failure)
          ? (Object.values(failure.response?.data.errors ?? {}).flat()[0] ??
              t("simulationError"))
          : t("simulationError"),
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    selection: {
      ...form,
      service,
      update: (patch) => {
        setForm((current) => ({
          ...current,
          ...patch,
          ...(patch.serviceId
            ? {
                duration:
                  context?.business?.services.find(
                    (item) => item.id === Number(patch.serviceId),
                  )?.duration_minutes ?? 30,
                participants: 1,
              }
            : {}),
        }));
        setError("");
      },
    },
    result: {
      data: result?.key === key ? result.data : null,
      busy,
      error,
      run: () => void run(),
    },
  };
};
