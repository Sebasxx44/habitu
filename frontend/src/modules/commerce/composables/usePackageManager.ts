import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { commerceService } from "@/modules/commerce/commerceService";
import type {
  CommerceError,
  PackageForm,
  PackageManagerState,
} from "@/modules/commerce/types";

// COMPOSABLE
export const usePackageManager = (
  businessId: number,
  refresh: () => void,
): PackageManagerState => {
  // STATE
  const [form, setForm] = useState<PackageForm>({
    name: "",
    description: "",
    serviceIds: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  // ACTIONS
  const run = async (action: () => Promise<void>): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      refresh();
    } catch (failure) {
      const data = isAxiosError<CommerceError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(data?.errors || {}).flat()[0] ||
          data?.message ||
          "No se pudo guardar el paquete.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      await commerceService.createPackage(businessId, form);
      setForm({ name: "", description: "", serviceIds: [] });
    });
  const remove = (id: number) =>
    run(async () => {
      await commerceService.removePackage(id);
    });
  const setField = (field: "name" | "description", value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const toggleService = (id: number) =>
    setForm((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(id)
        ? current.serviceIds.filter((value) => value !== id)
        : current.serviceIds.length < 6
          ? [...current.serviceIds, id]
          : current.serviceIds,
    }));
  // PUBLIC API
  return {
    editor: { form, busy, error },
    actions: { save, remove, setField, toggleService },
  };
};
