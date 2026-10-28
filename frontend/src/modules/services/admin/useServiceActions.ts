import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { adminServicesApi } from "@/modules/services/admin/adminServicesApi";
import type { Service } from "@/types/models";
import type { ServiceActionsState } from "@/modules/services/admin/types";

// COMPOSABLE
export const useServiceActions = (
  service: Service,
  refresh: () => Promise<void>,
): ServiceActionsState => {
  // STATE
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const navigate = useNavigate();

  // ACTIONS
  const execute = async (remove: boolean) => {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      if (remove) {
        await adminServicesApi.remove(service.id);
        navigate("/admin/services", { replace: true });
      } else
        await adminServicesApi.save(
          { is_active: service.is_active === false },
          service.id,
        );
      await refresh();
    } catch (failure) {
      const body = isAxiosError<{ message?: string }>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        body?.message || "No pudimos completar la acción. Intenta nuevamente.",
      );
    } finally {
      locked.current = false;
      setPending(false);
    }
  };

  // EXPOSE
  return {
    status: { pending, error },
    actions: { toggle: () => execute(false), remove: () => execute(true) },
  };
};
