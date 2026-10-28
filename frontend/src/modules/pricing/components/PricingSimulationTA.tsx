import { InteractiveChartTA } from "@/components/TA/InteractiveChartTA";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatTime } from "@/i18n/formatters";
import { discoveryDay } from "@/modules/discovery/query";
import { usePricingSimulation } from "@/modules/pricing/composables/usePricingSimulation";
import type { PricingContext } from "@/modules/pricing/types";
// COMPONENT
export const PricingSimulationTA = ({
  context,
}: {
  context: PricingContext;
}) => {
  const { t } = useTranslation("pricing");
  const { selection, result } = usePricingSimulation(context);
  // DERIVED STATE
  const chart = useMemo(() => {
    const groups = new Map<
      string,
      { time: string; min: number; max: number }
    >();
    for (const slot of result.data?.slots ?? []) {
      const current = groups.get(slot.start_time);
      groups.set(slot.start_time, {
        time: slot.start_time,
        min: Math.min(current?.min ?? slot.price, slot.price),
        max: Math.max(current?.max ?? slot.price, slot.price),
      });
    }
    return [...groups.values()];
  }, [result.data]);
  // RENDER
  return (
    <PanelTA title={t("simulation")} description={t("simulationDescription")}>
      <form
        className="grid gap-4 px-5 pb-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          result.run();
        }}
      >
        <label className="space-y-2 text-xs font-medium">
          {t("service")}
          <select
            value={selection.serviceId}
            onChange={(event) =>
              selection.update({ serviceId: event.target.value })
            }
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
          >
            {context.business?.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-xs font-medium">
          {t("branch")}
          <select
            value={selection.branchId}
            onChange={(event) =>
              selection.update({ branchId: event.target.value })
            }
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
          >
            {context.business?.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-xs font-medium">
          {t("date")}
          <InputTA
            type="date"
            required
            min={discoveryDay()}
            value={selection.date}
            onChange={(event) => selection.update({ date: event.target.value })}
          />
        </label>
        {selection.service?.duration_mode === "selectable" ? (
          <label className="space-y-2 text-xs font-medium">
            {t("duration")}
            <select
              value={selection.duration}
              onChange={(event) =>
                selection.update({ duration: Number(event.target.value) })
              }
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
            >
              {selection.service.duration_options.map((duration) => (
                <option key={duration} value={duration}>
                  {t("minutes", { count: duration })}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="self-end py-3 text-xs text-muted-foreground">
            {t("duration")} ·{" "}
            {t("minutes", { count: selection.service?.duration_minutes ?? 0 })}
          </p>
        )}
        {selection.service?.booking_model === "capacity" && (
          <label className="space-y-2 text-xs font-medium">
            {t("participants")}
            <InputTA
              required
              type="number"
              min={1}
              max={500}
              value={selection.participants}
              onChange={(event) =>
                selection.update({ participants: Number(event.target.value) })
              }
            />
          </label>
        )}
        <div className="sm:col-span-2">
          <ButtonTA
            type="submit"
            className="w-full sm:w-auto"
            disabled={
              result.busy || !selection.serviceId || !selection.branchId
            }
          >
            {t(result.busy ? "calculating" : "calculate")}
          </ButtonTA>
        </div>
      </form>
      {result.busy ? (
        <div className="p-5">
          <Skeleton className="h-60 rounded-xl" />
        </div>
      ) : result.error ? (
        <StateTA
          error
          title={t("simulationError")}
          description={result.error}
          onRetry={result.run}
        />
      ) : !result.data ? (
        <StateTA
          title={t("simulationEmpty")}
          description={t("simulationEmptyDescription")}
        />
      ) : !result.data.slots.length ? (
        <StateTA title={t("noSlots")} description={t("noSlotsDescription")} />
      ) : (
        <>
          <div className="px-5 pb-5">
            <InteractiveChartTA title={t("chart")} description="Simulación por horario disponible; los importes no son ingresos históricos." currency={context.currency} initialType="line" allowedTypes={["line", "area", "bar", "table"]}
              data={chart.map((slot) => ({ label: slot.time, values: { min: slot.min, max: slot.max } }))}
              series={[{ key: "min", label: t("min"), format: "currency" }, { key: "max", label: t("max"), format: "currency" }]}
              labelFormatter={formatTime} />
          </div>
          <div className="max-h-96 overflow-auto border-t border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  {["time", "base", "final", "applied", "availability"].map(
                    (key) => (
                      <th
                        key={key}
                        className="whitespace-nowrap px-5 py-3 font-medium"
                      >
                        {t(key)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.slots.map((slot, index) => (
                  <tr key={`${slot.start_time}-${index}`}>
                    <th
                      scope="row"
                      className="whitespace-nowrap px-5 py-4 font-medium"
                    >
                      {formatTime(slot.start_time)}
                      <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                        {slot.resource_name ?? slot.professional_name}
                      </span>
                    </th>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatCurrency(
                        slot.dynamic_pricing.base_price,
                        context.currency,
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {formatCurrency(slot.price, context.currency)}
                    </td>
                    <td className="min-w-36 px-5 py-4">
                      {slot.dynamic_pricing.rule?.name ?? t("noRule")}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          slot.available
                            ? "text-primary"
                            : "text-muted-foreground"
                        }
                      >
                        {t(slot.available ? "available" : "occupied")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="border-t border-border px-5 py-4 text-xs leading-relaxed text-muted-foreground">
        {t("pricePolicy")}
      </p>
    </PanelTA>
  );
};
