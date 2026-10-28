import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientsService } from "@/modules/clients/services/clientsService";
import type { ClientRemovalState } from "@/modules/clients/types";

// COMPOSABLE
export const useClientRemoval = (id: number): ClientRemovalState => {
  // STATE
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ACTIONS
  const submit = async (): Promise<void> => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await clientsService.remove(id);
      navigate("/admin/clients", { replace: true });
    } catch {
      setError("No pudimos eliminar el cliente. Inténtalo de nuevo.");
      setSaving(false);
    }
  };

  // RETURN
  return { removal: { saving, error, submit } };
};
