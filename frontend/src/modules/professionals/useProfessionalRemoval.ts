import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { professionalsService } from "@/modules/professionals/professionalsService";

import type { ProfessionalRemovalReturn } from "@/modules/professionals/types";

// COMPOSABLE
export const useProfessionalRemoval = (
  id: number,
  expectedName: string,
): ProfessionalRemovalReturn => {
  // STATE
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ACTIONS
  const remove = async () => {
    if (!expectedName || name.trim() !== expectedName.trim()) return;
    setSaving(true);
    setError("");
    try {
      await professionalsService.remove(id);
      navigate("/admin/professionals", { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos eliminar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  };
  const deactivate = async () => {
    setSaving(true);
    setError("");
    try {
      await professionalsService.deactivate(id);
      navigate(`/admin/professionals/${id}`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos desactivar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  // RETURN
  return {
    confirmation: { name, setName },
    request: { saving, error },
    actions: { remove, deactivate },
  };
};
