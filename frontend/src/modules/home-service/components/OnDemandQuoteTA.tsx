import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { onDemandService } from "@/services/ondemand/ondemandService";
import { formatHomeServicePrice } from "@/modules/home-service/helpers";
import type { OnDemandRequest } from "@/services/ondemand/ondemandService";

// TYPES
interface QuoteProps {
  request: OnDemandRequest;
  professional?: boolean;
  onChanged?: () => Promise<void>;
}

// COMPONENT
export const OnDemandQuoteTA = ({
  request,
  professional = false,
  onChanged,
}: QuoteProps) => {
  // COMPOSABLES
  const { i18n } = useTranslation();
  // STATE
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [quote, setQuote] = useState(request.metadata?.price_quote);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // COMPUTED
  const english = i18n.language.startsWith("en");
  const persisted = request.metadata?.price_quote;
  const current =
    persisted?.id === quote?.id && persisted?.accepted_at
      ? persisted
      : (quote ?? persisted);
  // ACTIONS
  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      setQuote(
        professional
          ? await onDemandService.proposeQuote(
              request.id,
              Number(amount),
              reason,
            )
          : current
            ? await onDemandService.acceptQuote(request.id, current.id)
            : undefined,
      );
      await onChanged?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // RENDER
  if (!["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"].includes(request.status))
    return null;
  return (
    <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
      <p className="font-semibold">
        {english ? "Agreed price and extras" : "Valor acordado y extras"}
      </p>
      <p className="text-xs text-muted-foreground">
        {english
          ? "Price changes require customer acceptance before completion. This action does not charge a payment."
          : "Los cambios de precio requieren aceptación del cliente antes de finalizar. Esta acción no realiza un cobro."}
      </p>
      {current && (
        <div>
          <p className="font-medium">
            {formatHomeServicePrice(current.amount, request.currency)}
          </p>
          <p>{current.reason}</p>
          <p className="mt-1 text-xs">
            {current.accepted_at
              ? english
                ? "Accepted by customer"
                : "Aceptado por el cliente"
              : english
                ? "Awaiting customer acceptance"
                : "Pendiente de aceptación del cliente"}
          </p>
        </div>
      )}
      {professional ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <InputTA
            aria-label={english ? "New total" : "Nuevo total"}
            placeholder={english ? "New total" : "Nuevo total"}
            type="number"
            min={0}
            max={9999999999.99}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <InputTA
            aria-label={english ? "Scope and reason" : "Alcance y motivo"}
            placeholder={english ? "Scope and reason" : "Alcance y motivo"}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            maxLength={1000}
            required
          />
          <ButtonTA
            type="submit"
            disabled={busy || !amount || reason.trim().length < 10}
            variant="outline"
          >
            {english ? "Send price quote" : "Proponer cotización"}
          </ButtonTA>
        </form>
      ) : (
        current &&
        !current.accepted_at && (
          <ButtonTA onClick={() => void save()} disabled={busy}>
            {english ? "Accept this price" : "Aceptar este valor"}
          </ButtonTA>
        )
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {english
            ? "Could not update the quote. Refresh and try again."
            : "No se pudo actualizar la cotización. Actualiza e intenta otra vez."}
        </p>
      )}
    </div>
  );
};
