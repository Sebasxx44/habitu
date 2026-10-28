import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  onDemandService,
  type OnDemandRequest,
} from "@/services/ondemand/ondemandService";
import {
  homeServiceDescription,
  validateHomeService,
} from "@/modules/home-service/helpers";
import type {
  HomeServiceErrors,
  HomeServiceForm,
  HomeServiceFormState,
  HomeServicePoint,
} from "@/modules/home-service/types";

// CONSTANTS
const emptyForm: HomeServiceForm = {
  category: "",
  description: "",
  address: "",
  instructions: "",
};

// COMPOSABLE
export const useHomeServiceForm = (
  point: HomeServicePoint | null,
  onCreated: (request: OnDemandRequest) => void,
): HomeServiceFormState => {
  // STATE
  const [values, setValues] = useState<HomeServiceForm>(emptyForm);
  const [errors, setErrors] = useState<HomeServiceErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  // SERVICES
  const { addToast } = useToast();

  // COMPUTED
  const currentErrors = validateHomeService(values, point);
  const progress = ["category", "description", "address", "location"].filter(
    (field) => !(field in currentErrors),
  ).length;

  // ACTIONS
  const setField = (field: keyof HomeServiceForm, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const submit = async () => {
    if (busy.current) return;
    const nextErrors = validateHomeService(values, point);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !point) {
      addToast(
        "Revisa los campos indicados antes de enviar tu solicitud.",
        "error",
      );
      document
        .getElementById(`home-service-${Object.keys(nextErrors)[0]}`)
        ?.focus();
      return;
    }
    busy.current = true;
    setSubmitting(true);
    try {
      const request = await onDemandService.request({
        description: homeServiceDescription(values),
        client_address: values.address.trim(),
        client_lat: point.lat,
        client_lng: point.lng,
      });
      onCreated(request);
      addToast(
        "Solicitud enviada. Aquí puedes seguir el estado de tu atención.",
        "success",
      );
    } catch (failure) {
      addToast(
        failure instanceof Error
          ? failure.message
          : "No pudimos enviar tu solicitud. Inténtalo de nuevo.",
        "error",
      );
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };
  const reset = (address?: string) => {
    setValues((current) => ({ ...emptyForm, address: address ?? current.address }));
    setErrors({});
  };

  // RETURN
  return {
    values,
    errors: { ...errors, ...(point ? { location: undefined } : {}) },
    submitting,
    progress,
    setField,
    submit,
    reset,
  };
};
