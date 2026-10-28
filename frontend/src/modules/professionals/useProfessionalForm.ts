import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { professionalsService } from "@/modules/professionals/professionalsService";
import type {
  ProfessionalForm,
  ProfessionalFormReturn,
} from "@/modules/professionals/types";

// CONSTANTS
const emptyForm: ProfessionalForm = {
  name: "",
  email: "",
  phone: "",
  specialty: "",
  bio: "",
  photo_url: "",
  commission_percentage: "50",
  is_active: true,
};

// COMPOSABLE
export const useProfessionalForm = (
  businessId?: number | null,
  id?: number,
): ProfessionalFormReturn => {
  // STATE
  const navigate = useNavigate();
  const [value, setValue] = useState<ProfessionalForm>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoError, setPhotoError] = useState("");

  // LIFECYCLE
  useEffect(() => {
    if (!id) return;
    let alive = true;
    professionalsService
      .find(id)
      .then((record) => {
        if (alive)
          setValue({
            name: record.name,
            email: record.email ?? "",
            phone: record.phone ?? "",
            specialty: record.specialty ?? "",
            bio: record.bio ?? "",
            photo_url: record.photo_url ?? "",
            commission_percentage: String(record.commission_percentage ?? 0),
            is_active: record.is_active ?? false,
          });
      })
      .catch((reason) => {
        if (alive)
          setError(
            reason instanceof Error
              ? reason.message
              : "No pudimos cargar el perfil.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // ACTIONS
  const setField = <K extends keyof ProfessionalForm>(
    key: K,
    fieldValue: ProfessionalForm[K],
  ) => setValue((previous) => ({ ...previous, [key]: fieldValue }));
  const uploadPhoto = (file?: File) => {
    setPhotoError("");
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setPhotoError("Usa una imagen JPG, PNG o WebP de hasta 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setField("photo_url", reader.result);
    };
    reader.onerror = () =>
      setPhotoError("No pudimos leer la imagen. Intenta otra vez.");
    reader.readAsDataURL(file);
  };
  const save = async () => {
    if (!businessId) {
      setError("No tienes un negocio asignado.");
      return;
    }
    if (
      !value.name.trim() ||
      !value.commission_percentage.trim() ||
      !Number.isFinite(Number(value.commission_percentage)) ||
      Number(value.commission_percentage) < 0 ||
      Number(value.commission_percentage) > 100
    ) {
      setError("Completa el nombre y una comisión entre 0 y 100.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const record = await professionalsService.save(value, businessId, id);
      navigate(`/admin/professionals/${record.id}`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  };

  // RETURN
  return {
    form: { value, setField, uploadPhoto },
    request: { loading, saving, error, photoError, save },
  };
};
