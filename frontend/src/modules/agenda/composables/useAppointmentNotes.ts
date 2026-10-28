import { useEffect, useRef, useState } from "react";
import { httpService } from "@/services/auth/authService";
import type { AppointmentNotesState } from "@/modules/agenda/types";

// COMPOSABLE
export const useAppointmentNotes = (
  id: number,
  initial: string | undefined,
  enabled: boolean,
  onSaved: () => void,
): AppointmentNotesState => {
  // STATE
  const [value, setValue] = useState(initial ?? "");
  const [baseline, setBaseline] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const edited = useRef(false);

  // EFFECTS
  useEffect(() => {
    if (!edited.current) {
      setValue(initial ?? "");
      setBaseline(initial ?? "");
    }
  }, [initial]);

  // ACTIONS
  const change = (text: string) => {
    edited.current = true;
    setValue(text);
    setSaved(false);
  };
  const save = async () => {
    if (pending.current || !enabled || value === baseline) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await httpService.put(`/v2/appointments/${id}`, { notes: value.trim() });
      setBaseline(value.trim());
      setValue(value.trim());
      edited.current = false;
      setSaved(true);
      onSaved();
    } catch {
      setError(
        "No se pudieron guardar las notas. Tu texto se conserva para reintentar.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  // RETURN
  return {
    value,
    setValue: change,
    saving,
    error,
    saved,
    dirty: value !== baseline,
    save,
  };
};
