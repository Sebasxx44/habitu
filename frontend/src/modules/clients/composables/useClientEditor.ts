import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { clientsService } from "@/modules/clients/services/clientsService";
import type {
  ClientDraft,
  ClientEditorState,
  ClientRecord,
} from "@/modules/clients/types";

// COMPOSABLE
export const useClientEditor = (
  businessId?: number | null,
  client?: ClientRecord,
): ClientEditorState => {
  // STATE
  const navigate = useNavigate();
  const [values, setValues] = useState<ClientDraft>({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    notes: client?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ACTIONS
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (saving) return;
    if (!businessId) {
      setError("No se encontró un negocio asociado a tu cuenta.");
      return;
    }
    if (!values.name.trim() || !values.email.trim()) {
      setError("Completa el nombre y el correo del cliente.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await clientsService.save(values, businessId, client?.id);
      navigate(`/admin/clients/${saved.id}`, { replace: true });
    } catch (failure) {
      const message = isAxiosError<{
        message?: string;
        errors?: Record<string, string[]>;
      }>(failure)
        ? Object.values(failure.response?.data.errors || {})
            .flat()
            .join(" ") || failure.response?.data.message
        : null;
      setError(
        message ||
          "No pudimos guardar el cliente. Revisa los datos e inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  // RETURN
  return {
    form: {
      values,
      change: (field, value) =>
        setValues((previous) => ({ ...previous, [field]: value })),
      saving,
      error,
      submit,
    },
  };
};
