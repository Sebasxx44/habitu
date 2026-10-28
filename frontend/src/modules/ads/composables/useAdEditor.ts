import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { adsService } from "@/modules/ads/adsService";
import type {
  AdEditorState,
  AdForm,
  AdRecord,
  AdsError,
} from "@/modules/ads/types";

// CONSTANTS
const initial = (businessId: number): AdForm => ({
  business_id: String(businessId),
  title: "",
  description: "",
  image_url: "",
  placement: "HOME",
  start_date: "",
  end_date: "",
  budget: "",
  impression_limit: "",
  click_limit: "",
});

// COMPOSABLE
export const useAdEditor = (
  businessId: number,
  refresh: () => void,
): AdEditorState => {
  // STATE
  const [id, setId] = useState<number | null>(null);
  const [form, setForm] = useState<AdForm>(initial(businessId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  // ACTIONS
  const setField = (field: keyof AdForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const reset = () => {
    setId(null);
    setForm(initial(businessId));
    setError(null);
  };
  const edit = (ad: AdRecord) => {
    setId(ad.id);
    setError(null);
    setForm({
      business_id: String(ad.business_id),
      title: ad.title,
      description: ad.description || "",
      image_url: ad.image_url || "",
      placement: ad.placement,
      start_date: ad.start_date.slice(0, 10),
      end_date: ad.end_date.slice(0, 10),
      budget: ad.budget || "",
      impression_limit: ad.impression_limit?.toString() || "",
      click_limit: ad.click_limit?.toString() || "",
    });
  };
  const save = async (): Promise<void> => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      await adsService.save(id, form);
      reset();
      refresh();
    } catch (failure) {
      const response = isAxiosError<AdsError>(failure)
        ? failure.response?.data
        : undefined;
      setError(
        Object.values(response?.errors || {}).flat()[0] ||
          response?.message ||
          "No se pudo guardar el anuncio.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  // PUBLIC API
  return {
    editor: { id, form, busy, error },
    actions: { edit, reset, setField, save },
  };
};
