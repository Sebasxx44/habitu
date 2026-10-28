import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  operationsService,
  operationError,
} from "@/modules/operations/services/operationsService";
import type {
  OperationsContext,
  OperationSchedule,
  ProfessionalOperationsResult,
} from "@/modules/operations/types";

// COMPOSABLE
export const useProfessionalOperations = (
  context: OperationsContext,
  reload: () => void,
  initialId?: number,
): ProfessionalOperationsResult => {
  // SERVICES
  const { t } = useTranslation("operations");
  // STATE
  const [professionalId, setProfessionalId] = useState(
    initialId ?? context.professionals[0]?.id ?? 0,
  );
  const [branchId, setBranchId] = useState(context.branches[0]?.id ?? 0);
  const [slots, setSlots] = useState<OperationSchedule[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  // LIFECYCLE
  useEffect(() => {
    const professional = context.professionals.find(
      (item) => item.id === professionalId,
    );
    setSlots(
      [1, 2, 3, 4, 5, 6, 0].map((day) => {
        const slot = professional?.availability.find(
          (item) => item.day_of_week === day && item.branch_id === branchId,
        );
        return {
          day_of_week: day,
          is_available: slot?.is_available ?? false,
          start_time: slot?.start_time.slice(0, 5) ?? "09:00",
          end_time: slot?.end_time.slice(0, 5) ?? "18:00",
          break_start_time: slot?.break_start_time?.slice(0, 5) ?? null,
          break_end_time: slot?.break_end_time?.slice(0, 5) ?? null,
        };
      }),
    );
    setSelected(
      context.service_links
        .filter(
          (link) =>
            link.professional_id === professionalId &&
            link.branch_id === branchId &&
            link.is_active,
        )
        .map((link) => link.service_id),
    );
    setError("");
  }, [context, professionalId, branchId]);
  // ACTIONS
  const save = async (kind: "schedule" | "services") => {
    if (pending.current || !professionalId || !branchId) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (kind === "schedule")
        await operationsService.schedule(professionalId, branchId, slots);
      else await operationsService.services(professionalId, branchId, selected);
      setSaved(true);
      reload();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? operationError(failure, t("saveError"))
          : t("saveError"),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // EXPOSE
  return {
    selection: { professionalId, branchId, setProfessionalId, setBranchId },
    schedule: {
      slots,
      update: (day, key, value) => {
        setSaved(false);
        setSlots((current) =>
          current.map((slot) =>
            slot.day_of_week === day ? { ...slot, [key]: value } : slot,
          ),
        );
      },
      save: () => save("schedule"),
    },
    services: {
      selected,
      toggle: (id) => {
        setSaved(false);
        setSelected((current) =>
          current.includes(id)
            ? current.filter((value) => value !== id)
            : [...current, id],
        );
      },
      save: () => save("services"),
    },
    feedback: { busy, error, saved },
  };
};
