import { DateRangeFilterTA } from "@/components/TA/DateRangeFilterTA";
import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { ArrowUpRight, LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { DashboardSkeletonTA, StateTA } from "@/components/TA/StateTA";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEarnings } from "@/modules/earnings/composables/useEarnings";
import { useWithdrawal } from "@/modules/earnings/composables/useWithdrawal";
import { WithdrawalHistoryTA } from "@/modules/earnings/WithdrawalHistoryTA";

// CONSTANTS
const transactionLabels: Record<string, string> = {
  PAYOUT: "Abono por servicio",
  DEPOSIT: "Depósito",
  CREDIT: "Abono",
  DEBIT: "Débito",
  WITHDRAWAL: "Solicitud de retiro",
  REFUND: "Reembolso",
  PAYMENT: "Pago",
};

// COMPONENT
export const EarningsPage = () => {
  const { earnings, filters } = useEarnings();
  const data = earnings.data;
  const { withdrawal } = useWithdrawal(
    Number(data?.available_balance || 0),
    data?.currency,
    earnings.refresh,
  );
  const formatValue = (value: number | string): string =>
    data?.currency
      ? new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: data.currency,
          maximumFractionDigits: 2,
        }).format(Number(value))
      : `${Number(value).toLocaleString("es-CO")} · moneda no informada`;

  return (
    <div className="dashboard-enter space-y-7">
      <ActionHeaderTA
        eyebrow="Tus finanzas"
        title="Cada servicio tiene su recompensa."
        description="Consulta los abonos reales de tu billetera y el historial de tus movimientos."
        actions={
          <ButtonTA
            variant="outline"
            onClick={earnings.refresh}
            disabled={earnings.loading}
          >
            <RefreshCw className={earnings.loading ? "animate-spin" : ""} />
            Actualizar
          </ButtonTA>
        }
      />
      <DateRangeFilterTA value={filters.range} onChange={filters.setRange} />
      {earnings.error && (
        <StateTA
          error
          title="No pudimos consultar tu billetera"
          description={earnings.error}
          onRetry={earnings.refresh}
        />
      )}
      {!data && earnings.loading ? (
        <DashboardSkeletonTA />
      ) : data && !earnings.error ? (
        <>
          <section className="dashboard-hero flex flex-col justify-between gap-6 rounded-3xl p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="mb-4 flex items-center gap-2 text-xs font-medium text-white/70">
                <Wallet className="size-4" />
                Saldo disponible de tu billetera
              </p>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {formatValue(data.available_balance)}
              </p>
              <p className="mt-3 text-xs text-white/65">
                {data.currency || "Moneda no informada"} · El retiro se registra
                como una solicitud pendiente.
              </p>
            </div>
            <ButtonTA
              variant="outline"
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              disabled={
                earnings.loading ||
                !data.currency ||
                Number(data.available_balance) < 10000
              }
              onClick={() => withdrawal.setOpen(true)}
            >
              Solicitar retiro
              <ArrowUpRight />
            </ButtonTA>
          </section>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Abonos de hoy", value: data.today_earnings },
              { label: "Abonos de esta semana", value: data.week_earnings },
              { label: "Abonos de este mes", value: data.month_earnings },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <dt className="text-xs text-muted-foreground">
                  {metric.label}
                </dt>
                <dd className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                  {formatValue(metric.value)}
                </dd>
                <dd className="mt-2 text-[11px] text-muted-foreground">
                  Movimientos registrados por servicios
                </dd>
              </div>
            ))}
          </dl>
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Resultados del período">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><p className="text-xs text-muted-foreground">Abonos del período</p><p className="mt-3 text-2xl font-semibold">{formatValue(data.period_earnings)}</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">Servicios completados del período</p><p className="mt-3 text-2xl font-semibold">{data.period_completed_services}</p></div>
            <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">Valoración del período</p><p className="mt-3 text-2xl font-semibold">{data.period_rating == null || data.period_rating === 0 ? "Sin valoraciones" : `${data.period_rating.toFixed(1)} / 5`}</p></div>
          </section>
          <div className="grid gap-5 xl:grid-cols-2">
            <InteractiveChartTA title="Abonos por día" description="Movimientos reales por servicios durante el período seleccionado." currency={data.currency} initialType="area"
              data={data.series.map((day) => ({ label: day.date, values: { earnings: day.earnings } }))} series={[{ key: "earnings", label: "Abonos", format: "currency" }]}
              labelFormatter={(label) => new Date(`${label}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} />
            <InteractiveChartTA title="Servicios completados por día" description="Actividad profesional durante el período seleccionado." initialType="bar"
              data={data.series.map((day) => ({ label: day.date, values: { services: day.completed_services } }))} series={[{ key: "services", label: "Servicios completados" }]}
              labelFormatter={(label) => new Date(`${label}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" })} />
          </div>
          <WithdrawalHistoryTA data={data} refresh={earnings.refresh} />
          <PanelTA
            title="Movimientos de tu billetera"
            description="Últimas 20 operaciones dentro del período seleccionado; los gráficos incluyen todos los abonos del período."
          >
            {data.recent_transactions.length ? (
              <div className="overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      {["Movimiento", "Fecha", "Importe", "Estado"].map(
                        (label) => (
                          <th
                            key={label}
                            scope="col"
                            className="border-b border-border px-5 py-3 font-medium text-muted-foreground"
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-border last:border-0"
                      >
                        <th scope="row" className="px-5 py-4 font-medium">
                          <p>
                            {transaction.description ||
                              transactionLabels[transaction.type] ||
                              transaction.type}
                          </p>
                          <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                            {transactionLabels[transaction.type] ||
                              transaction.type}
                          </p>
                        </th>
                        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                          {new Intl.DateTimeFormat("es-CO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(transaction.created_at))}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums">
                          {formatValue(transaction.amount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                          {transaction.status === "COMPLETED"
                            ? "Completado"
                            : transaction.status === "PENDING"
                              ? "Pendiente"
                              : transaction.status || "Registrado"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <StateTA
                title="Tu historial está por comenzar"
                description="Tus abonos, pagos y solicitudes de retiro aparecerán aquí cuando se registren."
              />
            )}
          </PanelTA>
        </>
      ) : null}
      <Dialog open={withdrawal.open} onOpenChange={withdrawal.setOpen}>
        <DialogContent
          showCloseButton={!withdrawal.submitting}
          className="rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle>Solicitar un retiro</DialogTitle>
            <DialogDescription>
              El importe se descontará de tu billetera al registrar la
              solicitud. La transferencia quedará pendiente de procesamiento.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void withdrawal.submit();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="withdrawal-amount"
                className="mb-2 block text-xs font-medium"
              >
                Monto ({data?.currency})
              </label>
              <InputTA
                id="withdrawal-amount"
                inputMode="decimal"
                type="number"
                min="10000"
                max={Number(data?.available_balance || 0)}
                step="0.01"
                required
                value={withdrawal.form.amount}
                onChange={(event) =>
                  withdrawal.setField("amount", event.target.value)
                }
                disabled={withdrawal.submitting}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Mínimo 10.000 · Disponible{" "}
                {formatValue(data?.available_balance || 0)}
              </p>
            </div>
            <div>
              <label
                htmlFor="withdrawal-bank"
                className="mb-2 block text-xs font-medium"
              >
                Banco
              </label>
              <InputTA
                id="withdrawal-bank"
                required
                maxLength={100}
                value={withdrawal.form.bankName}
                onChange={(event) =>
                  withdrawal.setField("bankName", event.target.value)
                }
                disabled={withdrawal.submitting}
              />
            </div>
            <div>
              <label
                htmlFor="withdrawal-account"
                className="mb-2 block text-xs font-medium"
              >
                Número de cuenta
              </label>
              <InputTA
                id="withdrawal-account"
                required
                maxLength={255}
                autoComplete="off"
                value={withdrawal.form.bankAccount}
                onChange={(event) =>
                  withdrawal.setField("bankAccount", event.target.value)
                }
                disabled={withdrawal.submitting}
              />
            </div>
            {withdrawal.error && (
              <p role="alert" className="text-sm text-destructive">
                {withdrawal.error}
              </p>
            )}
            <DialogFooter className="gap-2">
              <ButtonTA
                variant="outline"
                type="button"
                disabled={withdrawal.submitting}
                onClick={() => withdrawal.setOpen(false)}
              >
                Cancelar
              </ButtonTA>
              <ButtonTA type="submit" disabled={withdrawal.submitting}>
                {withdrawal.submitting && (
                  <LoaderCircle className="animate-spin" />
                )}
                {withdrawal.submitting ? "Enviando…" : "Confirmar solicitud"}
              </ButtonTA>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
