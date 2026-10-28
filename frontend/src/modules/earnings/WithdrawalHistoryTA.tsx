import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { useWithdrawalHistory } from "@/modules/earnings/composables/useWithdrawalHistory";
import type { EarningsSummary } from "@/modules/earnings/types";

// CONSTANTS
const labels: Record<string, string> = {
  PENDING: "Solicitado",
  IN_REVIEW: "En revisión",
  SENT: "Enviado al proveedor",
  CONFIRMED: "Confirmado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
  COMPLETED: "Registrado como completado",
};

// COMPONENT
export const WithdrawalHistoryTA = ({
  data,
  refresh,
}: {
  data: EarningsSummary;
  refresh: () => void;
}) => {
  // COMPOSABLES
  const { cancellation, actions } = useWithdrawalHistory(refresh);
  // COMPUTED
  const money = (value: string) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: data.currency || "COP",
    }).format(Number(value));

  return (
    <PanelTA
      title="Solicitudes de retiro"
      description={`Reservado para solicitudes: ${money(data.reserved_for_withdrawal || "0")}`}
    >
      <div className="space-y-4 px-5 pb-5">
        {!data.transfer_provider_enabled && (
          <p className="text-sm text-muted-foreground">
            La transferencia externa requiere procesamiento del negocio. Una
            solicitud pendiente todavía no es dinero recibido en tu banco.
          </p>
        )}
        {cancellation.error && (
          <p role="alert" className="text-sm text-destructive">
            {cancellation.error}
          </p>
        )}
        {!data.withdrawals?.length && (
          <p className="text-sm text-muted-foreground">
            Todavía no tienes solicitudes de retiro.
          </p>
        )}
        {data.withdrawals?.map((request) => (
          <article
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div>
              <p className="text-sm font-semibold">
                {money(request.amount)} ·{" "}
                {labels[request.status] || request.status}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                #{request.id} · {request.bank_name} · Cuenta ••••{" "}
                {request.bank_account_last4}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Solicitado{" "}
                {new Date(request.created_at).toLocaleDateString("es-CO")}
                {request.provider_confirmed && request.processed_at
                  ? ` · Confirmado ${new Date(request.processed_at).toLocaleDateString("es-CO")}`
                  : ""}
              </p>
            </div>
            {request.can_cancel && (
              <ButtonTA
                variant="outline"
                disabled={cancellation.busyId !== null}
                onClick={() => void actions.cancel(request.id)}
              >
                {cancellation.busyId === request.id
                  ? "Cancelando…"
                  : "Cancelar solicitud"}
              </ButtonTA>
            )}
          </article>
        ))}
      </div>
    </PanelTA>
  );
};
