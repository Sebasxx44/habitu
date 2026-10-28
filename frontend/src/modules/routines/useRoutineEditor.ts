import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { routineService } from "@/modules/routines/routineService";
import type {
  BookingRoutine,
  RoutineDraft,
  RoutineEditorResult,
} from "@/modules/routines/types";

// COMPOSABLE
export const useRoutineEditor = (
  reload: () => void,
  routine?: BookingRoutine,
): RoutineEditorResult => {
  // SERVICES
  const { t } = useTranslation("growth");
  // STATE
  const next = routine?.occurrences.find(
    (item) =>
      item.status === "PLANNED" &&
      new Date(
        `${item.date.slice(0, 10)}T${item.start_time.slice(0, 5)}:00-05:00`,
      ).getTime() > Date.now(),
  );
  const [value, setValue] = useState<RoutineDraft>({
    name: routine?.name ?? "",
    appointment_id: routine?.source_appointment_id ?? 0,
    interval_weeks: routine?.interval_weeks ?? 1,
    count: 4,
    start_date: next?.date.slice(0, 10) ?? "",
    start_time: next?.start_time.slice(0, 5) ?? "10:00",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  // ACTIONS
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (routine) await routineService.future(routine.id, value);
      else await routineService.create(value);
      setSaved(true);
      reload();
    } catch {
      setError(t("error"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  // EXPOSE
  return {
    form: {
      value,
      setField: (key, nextValue) => {
        setSaved(false);
        setValue((current) => ({ ...current, [key]: nextValue }));
      },
      submit,
    },
    feedback: { busy, error, saved },
  };
};
