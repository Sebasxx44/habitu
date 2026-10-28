import { useState } from "react";
import { ArrowDownLeft, CalendarDays, Search } from "lucide-react";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/formatters";
import {
  benefitDateKey,
  membershipStatusLabels,
} from "@/modules/benefits/adminPresentation";
import type {
  AdminBenefitTransaction,
  BenefitAdminKind,
} from "@/modules/benefits/adminTypes";

// COMPONENT
export const AdminBenefitActivityTA = ({
  transactions,
  kind,
}: {
  transactions: AdminBenefitTransaction[];
  kind: BenefitAdminKind;
}) => {
  // STATE
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  // COMPUTED
  const transactionKind =
    kind === "plans"
      ? "membership"
      : kind === "programs"
        ? "loyalty"
        : "promotion";
  const items = transactions.filter(
    (entry) =>
      entry.kind === transactionKind &&
      `${entry.client_name} ${entry.description} ${entry.reference ?? ""}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      (!from || benefitDateKey(entry.created_at) >= from) &&
      (!until || benefitDateKey(entry.created_at) <= until),
  );
  return (
    <div id="benefit-activity" className="scroll-mt-6">
      <PanelTA
        title="Movimientos y resultados"
        description="Hasta 50 movimientos recientes por módulo. Los indicadores superiores incluyen el histórico completo del negocio."
      >
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-[minmax(160px,1fr)_160px_160px] md:px-6">
          <label className="relative self-end">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <InputTA
              className="pl-10"
              placeholder="Cliente o referencia…"
              aria-label="Buscar movimientos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Desde</span>
            <InputTA
              type="date"
              max={until || undefined}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Hasta</span>
            <InputTA
              type="date"
              min={from || undefined}
              value={until}
              onChange={(event) => setUntil(event.target.value)}
            />
          </label>
        </div>
        {items.length ? (
          <div className="divide-y divide-border border-t border-border">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex items-start gap-3 px-5 py-4 md:px-6"
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                  <ArrowDownLeft className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.client_name}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <CalendarDays className="size-3" />
                    {formatDate(item.created_at, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {item.reference && (
                    <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                      {item.reference}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {item.unit === "COP"
                      ? formatCurrency(item.amount)
                      : `${item.amount > 0 ? "+" : ""}${formatNumber(item.amount)} sellos`}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {membershipStatusLabels[item.status] ?? item.status}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <StateTA
            title="Sin movimientos en esta selección"
            description="Los usos de cupones, pagos y movimientos de fidelidad se registran cuando tus clientes utilizan sus beneficios."
          />
        )}
      </PanelTA>
    </div>
  );
};
