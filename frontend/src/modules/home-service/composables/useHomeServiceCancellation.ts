import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  onDemandService,
  type OnDemandRequest,
} from "@/services/ondemand/ondemandService";
import { canCancelHomeService } from "@/modules/home-service/helpers";
import type { HomeServiceCancellationState } from "@/modules/home-service/types";

// COMPOSABLE
export const useHomeServiceCancellation = (
  request: OnDemandRequest | null,
  onCancelled: (request: OnDemandRequest) => void,
): HomeServiceCancellationState => {
  // STATE
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  // SERVICES
  const { addToast } = useToast();

  // LIFECYCLE
  useEffect(() => {
    setReason("");
  }, [request?.id]);

  // ACTIONS
  const cancel = async () => {
    if (!request || pending.current || !canCancelHomeService(request)) return;
    if (reason.trim().length < 3 || reason.length > 500) {
      addToast(
        "Cuéntanos brevemente el motivo de la cancelación (3 a 500 caracteres).",
        "error",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      onCancelled(await onDemandService.cancel(request.id, reason.trim()));
      addToast("Tu solicitud fue cancelada.", "info");
    } catch (failure) {
      addToast(
        failure instanceof Error
          ? failure.message
          : "No pudimos cancelar la solicitud.",
        "error",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  // RETURN
  return { reason, busy, setReason, cancel };
};
