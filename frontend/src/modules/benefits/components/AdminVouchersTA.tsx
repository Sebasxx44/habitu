import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatDate } from "@/i18n/formatters";
import { useVoucherDelivery } from "@/modules/benefits/composables/useVoucherDelivery";
import type { AdminVoucher } from "@/modules/benefits/adminTypes";

// COMPONENT
export const AdminVouchersTA = ({
  vouchers,
  refresh,
}: {
  vouchers: AdminVoucher[];
  refresh: () => void;
}) => {
  // COMPOSABLES
  const { delivery, actions } = useVoucherDelivery(refresh);
  // STATE
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  // COMPUTED
  const statusOf = (voucher: AdminVoucher): string =>
    voucher.status === "AVAILABLE" &&
    Date.parse(voucher.expires_at) < Date.now()
      ? "EXPIRED"
      : voucher.status;
  const items = vouchers.filter(
    (voucher) =>
      (!status || statusOf(voucher) === status) &&
      `${voucher.client_name} ${voucher.code} ${voucher.reward}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    USED: "Entregado",
    EXPIRED: "Vencido",
  };
  return (
    <PanelTA
      title="Canje y entrega de recompensas"
      description="Valida el código del cliente al entregar su recompensa. Cada vale se utiliza una vez."
    >
      <div className="space-y-4 px-5 pb-5 md:px-6">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            actions.select(delivery.code);
          }}
        >
          <InputTA
            required
            placeholder="Código de recompensa del cliente"
            aria-label="Código de recompensa"
            value={delivery.code}
            disabled={delivery.busy || delivery.confirming}
            onChange={(event) => actions.setCode(event.target.value)}
          />
          <ButtonTA
            disabled={
              delivery.busy || delivery.confirming || !delivery.code.trim()
            }
            type="submit"
          >
            <CheckCheck />
            Registrar entrega
          </ButtonTA>
        </form>
        {delivery.confirming && (
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-sm font-semibold">
              Confirmar entrega de la recompensa
            </p>
            <p className="mt-1 break-all font-mono text-xs">{delivery.code}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Confirma únicamente cuando hayas entregado el beneficio al
              cliente.
            </p>
            {delivery.error && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {delivery.error}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <ButtonTA
                disabled={delivery.busy}
                onClick={() => void actions.confirm()}
              >
                {delivery.busy ? "Registrando…" : "Confirmar entrega"}
              </ButtonTA>
              <ButtonTA
                variant="outline"
                disabled={delivery.busy}
                onClick={actions.close}
              >
                Cancelar
              </ButtonTA>
            </div>
          </div>
        )}
        {delivery.success && (
          <p role="status" className="text-sm text-primary">
            Recompensa entregada y registrada correctamente.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <InputTA
            aria-label="Buscar recompensas"
            placeholder="Buscar cliente, recompensa o código…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Estado del vale"
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {items.length ? (
        <div className="divide-y divide-border border-t border-border">
          {items.map((voucher) => (
            <article
              key={voucher.id}
              className="flex flex-wrap items-center gap-4 px-5 py-4 md:px-6"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{voucher.reward}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {voucher.client_name} · Vence {formatDate(voucher.expires_at)}
                </p>
                <p className="mt-2 select-all break-all font-mono text-xs">
                  {voucher.code}
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                {labels[statusOf(voucher)] ?? voucher.status}
              </span>
              {statusOf(voucher) === "AVAILABLE" && (
                <ButtonTA
                  variant="outline"
                  disabled={delivery.busy || delivery.confirming}
                  onClick={() => actions.select(voucher.code)}
                >
                  Entregar
                </ButtonTA>
              )}
            </article>
          ))}
        </div>
      ) : (
        <StateTA
          title="No hay recompensas en esta selección"
          description="Los vales aparecerán cuando los clientes canjeen sus sellos."
        />
      )}
    </PanelTA>
  );
};
