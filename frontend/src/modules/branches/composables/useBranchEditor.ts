import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { branchService } from "@/modules/branches/branchService";
import { branchDayIndex } from "@/modules/branches/schedule";
import { useToast } from "@/components/ui/Toast";
import type { BookingApiError } from "@/composables/booking/types";
import type {
  BranchEditorState,
  BranchForm,
  BranchScheduleInput,
  ManagedBranch,
} from "@/modules/branches/types";

// CONSTANTS
export const branchDays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const emptyForm = (): BranchForm => ({
  name: "",
  address: "",
  phone: "",
  email: "",
  lat: "",
  lng: "",
  is_main_branch: false,
  is_active: true,
  schedules: branchDays.map((_, day) => ({
    day,
    open_time: "09:00",
    close_time: "18:00",
    is_closed: day === 0,
  })),
});
const apiError = (error: Error): string => {
  const data = isAxiosError<BookingApiError>(error)
    ? error.response?.data
    : null;
  return (
    (data?.errors ? Object.values(data.errors).flat()[0] : null) ||
    data?.message ||
    data?.error ||
    "No se pudo guardar el cambio. Inténtalo de nuevo."
  );
};

// COMPOSABLE
export const useBranchEditor = (
  businessId: number | null | undefined,
  onSaved: () => void,
): BranchEditorState => {
  // STATE
  const { addToast } = useToast();
  const pending = useRef(false);
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<ManagedBranch | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ManagedBranch | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // ACTIONS
  const update = <K extends keyof BranchForm>(key: K, value: BranchForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const schedule = (day: number, values: Partial<BranchScheduleInput>) =>
    setForm((current) => ({
      ...current,
      schedules: current.schedules.map((row) =>
        row.day === day ? { ...row, ...values } : row,
      ),
    }));
  const create = () => {
    setBranch(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  };
  const edit = (selected: ManagedBranch) => {
    setBranch(selected);
    setForm({
      name: selected.name,
      address: selected.address,
      phone: selected.phone ?? "",
      email: selected.email ?? "",
      lat: selected.lat == null ? "" : String(selected.lat),
      lng: selected.lng == null ? "" : String(selected.lng),
      is_main_branch: !!selected.is_main_branch,
      is_active: !!selected.is_active,
      schedules: emptyForm().schedules.map((row) => {
        const stored = selected.schedules.find(
          (item) => branchDayIndex(String(item.day)) === row.day,
        );
        return stored
          ? {
              ...row,
              open_time: stored.open_time.slice(0, 5),
              close_time: stored.close_time.slice(0, 5),
              is_closed: stored.is_closed,
            }
          : { ...row, is_closed: true };
      }),
    });
    setError(null);
    setOpen(true);
  };
  const close = () => {
    if (!pending.current) setOpen(false);
  };
  const save = async () => {
    if (pending.current || !businessId) return;
    if (!form.name.trim() || !form.address.trim()) {
      setError("Completa el nombre y la dirección.");
      return;
    }
    const lat = form.lat.trim() === "" ? null : Number(form.lat);
    const lng = form.lng.trim() === "" ? null : Number(form.lng);
    if (
      (lat === null) !== (lng === null) ||
      (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
      (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180))
    ) {
      setError("Ingresa ambas coordenadas válidas o deja las dos vacías.");
      return;
    }
    if (
      form.schedules.some(
        (row) =>
          row.close_time <= row.open_time || !row.open_time || !row.close_time,
      )
    ) {
      setError("El cierre de cada día debe ser posterior a la apertura.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await branchService.save(branch?.id ?? null, {
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        lat,
        lng,
        business_id: businessId,
      });
      setOpen(false);
      addToast(branch ? "Sucursal actualizada" : "Sucursal creada", "success");
      onSaved();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? apiError(failure)
          : "No se pudo guardar la sucursal.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  const select = (selected: ManagedBranch | null) => {
    if (!pending.current) {
      setRemoving(selected);
      setRemoveError(null);
    }
  };
  const confirm = async () => {
    if (pending.current || !removing) return;
    pending.current = true;
    setSaving(true);
    setRemoveError(null);
    try {
      await branchService.remove(removing.id);
      setRemoving(null);
      addToast("Sucursal eliminada", "success");
      onSaved();
    } catch (failure) {
      setRemoveError(
        failure instanceof Error
          ? apiError(failure)
          : "No se pudo eliminar la sucursal.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  // RETURN
  return {
    editor: {
      open,
      branch,
      form,
      saving,
      error,
      update,
      schedule,
      create,
      edit,
      close,
      save,
    },
    removal: {
      branch: removing,
      busy: saving,
      error: removeError,
      select,
      confirm,
    },
  };
};
