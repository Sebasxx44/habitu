import { useState } from "react";
import { PanelTA } from "@/components/TA/PanelTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatCurrency, formatDate } from "@/i18n/formatters";
import { membershipStatusLabels } from "@/modules/benefits/adminPresentation";
import type { AdminMembership } from "@/modules/benefits/adminTypes";

// COMPONENT
export const AdminMembershipsTA = ({
  memberships,
}: {
  memberships: AdminMembership[];
}) => {
  // STATE
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  // COMPUTED
  const items = memberships.filter(
    (item) =>
      `${item.client.name} ${item.plan.name} ${item.payment_reference ?? ""}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      (!status || item.status === status),
  );
  return (
    <PanelTA
      title="Suscripciones de clientes"
      description="Últimas 50 suscripciones: vigencia, pago y consumo de citas."
    >
      <div className="flex flex-col gap-3 px-5 pb-4 sm:flex-row md:px-6">
        <InputTA
          aria-label="Buscar suscripciones"
          placeholder="Cliente, plan o referencia de pago…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="Estado de la suscripción"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {[...new Set(memberships.map((item) => item.status))].map((value) => (
            <option key={value} value={value}>
              {membershipStatusLabels[value] ?? value}
            </option>
          ))}
        </select>
      </div>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-border bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                {["Cliente / Plan", "Estado", "Vigencia", "Citas", "Pago"].map(
                  (label) => (
                    <th key={label} className="px-5 py-3 font-medium">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">{item.client.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.plan.name}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${item.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
                    >
                      {membershipStatusLabels[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <p>{formatDate(item.starts_at)}</p>
                    <p className="mt-1 text-muted-foreground">
                      a {formatDate(item.ends_at)}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <p>{item.appointments_used} utilizadas</p>
                    <p className="mt-1 text-muted-foreground">
                      {item.appointments_remaining} disponibles
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {formatCurrency(item.amount_paid)}
                    </p>
                    <p className="mt-1 max-w-48 break-all font-mono text-[10px] text-muted-foreground">
                      {item.payment_reference || "Sin referencia de pago"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <StateTA
          title="Sin suscripciones para mostrar"
          description={
            memberships.length
              ? "Prueba otra búsqueda o estado."
              : "Las membresías contratadas por tus clientes aparecerán aquí."
          }
        />
      )}
    </PanelTA>
  );
};
