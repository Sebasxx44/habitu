import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { onDemandService } from "@/services/ondemand/ondemandService";
import type { OnDemandRequest } from "@/services/ondemand/ondemandService";

// COMPONENT
export const OnDemandReassignmentTA = ({
  request,
  refresh,
}: {
  request: OnDemandRequest;
  refresh: () => Promise<void>;
}) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  // STATE
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // COMPUTED
  const english = i18n.language.startsWith("en");
  // ACTIONS
  const reassign = async () => {
    setBusy(true);
    setError(false);
    try {
      await onDemandService.reassign(request.id, reason);
      await refresh();
      setReason("");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // RENDER
  if (!["ACCEPTED", "ON_THE_WAY"].includes(request.status)) return null;
  return (
    <form
      className="space-y-3 rounded-xl border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void reassign();
      }}
    >
      <p className="text-sm font-semibold">
        {english ? "Supervised reassignment" : "Reasignación supervisada"}
      </p>
      <p className="text-xs text-muted-foreground">
        {english
          ? "Releases the current professional and starts a five-minute search. Arrival estimates change; the new professional must accept. The reason is visible in booking history."
          : "Libera al profesional actual y abre una búsqueda de cinco minutos. Cambia la estimación de llegada y requiere una nueva aceptación. El motivo será visible en el historial."}
      </p>
      <InputTA
        aria-label={english ? "Reason" : "Motivo"}
        placeholder={english ? "Explain the reason" : "Explica el motivo"}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        minLength={10}
        maxLength={1000}
        required
      />
      <ButtonTA
        variant="outline"
        type="submit"
        disabled={busy || reason.trim().length < 10}
      >
        {english
          ? "Release and start new search"
          : "Liberar e iniciar nueva búsqueda"}
      </ButtonTA>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {english
            ? "Could not reassign this service."
            : "No se pudo reasignar el servicio."}
        </p>
      )}
    </form>
  );
};
