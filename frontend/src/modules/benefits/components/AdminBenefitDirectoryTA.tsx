import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  Crown,
  Gift,
  Pencil,
  Search,
  TicketPercent,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/formatters";
import {
  benefitAdminModules,
  benefitAdminPath,
  benefitRecordStatus,
  benefitStatusLabels,
} from "@/modules/benefits/adminPresentation";
import { CopyBenefitCodeTA } from "@/modules/benefits/components/CopyBenefitCodeTA";
import { useAdminBenefitDirectory } from "@/modules/benefits/composables/useAdminBenefitDirectory";
import type {
  AdminBenefitsData,
  BenefitAdminKind,
} from "@/modules/benefits/adminTypes";

// COMPONENT
export const AdminBenefitDirectoryTA = ({
  kind,
  data,
  refresh,
}: {
  kind: BenefitAdminKind;
  data: AdminBenefitsData;
  refresh: () => void;
}) => {
  // COMPOSABLES
  const navigate = useNavigate();
  const { filters, records, removal } = useAdminBenefitDirectory(
    kind,
    data,
    refresh,
  );
  // COMPUTED
  const config = benefitAdminModules[kind];
  const Icon =
    kind === "promotions" ? TicketPercent : kind === "plans" ? Crown : Gift;
  return (
    <section className="space-y-5" aria-label={config.section}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {config.section}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {records.items.length} de {records.total} resultados
          </p>
        </div>
        <a
          href="#benefit-activity"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
        >
          Ver movimientos
          <ArrowUpRight className="size-4" />
        </a>
      </div>
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[minmax(180px,1fr)_180px_220px_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <InputTA
            className="pl-10"
            aria-label="Buscar beneficios"
            placeholder={
              kind === "promotions"
                ? "Buscar nombre o cupón…"
                : "Buscar nombre o descripción…"
            }
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar por estado"
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          value={filters.status}
          onChange={(event) => filters.setStatus(event.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(benefitStatusLabels)
            .filter(
              ([status]) =>
                kind === "promotions" ||
                !["scheduled", "exhausted"].includes(status),
            )
            .map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
        <select
          aria-label="Filtrar por servicio"
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          value={filters.serviceId}
          onChange={(event) => filters.setServiceId(event.target.value)}
        >
          <option value="">Todos los servicios</option>
          {data.services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <ButtonTA
          variant="ghost"
          onClick={filters.reset}
          disabled={!filters.search && !filters.status && !filters.serviceId}
        >
          Limpiar
        </ButtonTA>
      </div>
      {removal.success && (
        <p
          role="status"
          className="rounded-xl bg-primary/10 p-4 text-sm text-primary"
        >
          {removal.success}
        </p>
      )}
      {removal.selected && (
        <div
          role="region"
          aria-label="Confirmar pausa del beneficio"
          className="rounded-2xl border border-primary/20 bg-primary/5 p-5"
        >
          <h3 className="font-semibold">
            Pausar {removal.selected.name ?? removal.selected.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Dejará de ofrecerse a nuevos clientes. El historial y las membresías
            ya contratadas se conservan.
          </p>
          {removal.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {removal.error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <ButtonTA
              disabled={removal.busy}
              onClick={() => void removal.confirm()}
            >
              {removal.busy ? "Pausando…" : "Confirmar pausa"}
            </ButtonTA>
            <ButtonTA
              variant="outline"
              disabled={removal.busy}
              onClick={() => removal.select(null)}
            >
              Cancelar
            </ButtonTA>
          </div>
        </div>
      )}
      {records.items.length ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {records.items.map((item) => {
            const status = benefitRecordStatus(item);
            const serviceIds =
              kind === "programs"
                ? item.service_id
                  ? [item.service_id]
                  : []
                : kind === "plans"
                  ? (item.included_services ?? [])
                  : (item.services?.map((service) => service.id) ?? []);
            const services = serviceIds.map(
              (id) =>
                data.services.find((service) => service.id === id)?.name ??
                item.services?.find((service) => service.id === id)?.name ??
                `Servicio ${id}`,
            );
            const used = item.usage_count ?? 0;
            return (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : status === "scheduled" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
                  >
                    {benefitStatusLabels[status]}
                  </span>
                </div>
                <h3 className="break-words text-lg font-bold tracking-tight">
                  {item.name ?? item.title}
                </h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {item.description ||
                    (kind === "programs"
                      ? item.reward_description
                      : "Sin descripción adicional")}
                </p>
                <div className="my-5 rounded-xl bg-secondary/50 p-4">
                  {kind === "promotions" ? (
                    <>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-2xl font-bold tracking-tight text-primary">
                          {item.services?.length
                            ? `${item.services.length} servicios`
                            : item.type === "PERCENTAGE"
                              ? `${Number(item.discount)}%`
                              : formatCurrency(Number(item.discount))}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatNumber(used)} usos
                        </span>
                      </div>
                      {item.services?.length ? (
                        <ul className="mt-2 space-y-1 text-xs">
                          {item.services.map((service) => (
                            <li
                              key={service.id}
                              className="flex justify-between gap-3"
                            >
                              <span className="truncate">{service.name}</span>
                              <span className="shrink-0 font-semibold">
                                {service.pivot.type === "PERCENTAGE"
                                  ? `${Number(service.pivot.discount)}%`
                                  : formatCurrency(
                                      Number(service.pivot.discount),
                                    )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Descuento en servicios elegibles
                        </p>
                      )}
                      {item.usage_limit != null && (
                        <>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.min(100, (used / Math.max(1, item.usage_limit)) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {Math.max(0, item.usage_limit - used)} usos
                            disponibles de {item.usage_limit}
                          </p>
                        </>
                      )}
                    </>
                  ) : kind === "plans" ? (
                    <>
                      <p className="text-2xl font-bold tracking-tight text-primary">
                        {formatCurrency(
                          Number(item.price),
                          item.currency ?? "COP",
                        )}
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          /{" "}
                          {item.billing_cycle === "YEARLY"
                            ? "año"
                            : item.billing_cycle === "QUARTERLY"
                              ? "trimestre"
                              : "mes"}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.appointments_included ?? 0} citas incluidas ·{" "}
                        {Number(item.discount_percentage ?? 0)}% de descuento
                      </p>
                      <p className="mt-2 text-xs font-medium">
                        {item.active_subscribers_count ?? 0} activas ·{" "}
                        {item.subscribers_count ?? 0} suscripciones históricas
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold tracking-tight text-primary">
                        {item.stamps_required} sellos
                      </p>
                      <p className="mt-2 text-sm">{item.reward_description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.cards_count ?? 0} tarjetas inscritas
                      </p>
                    </>
                  )}
                </div>
                {kind === "promotions" && item.promo_code && (
                  <div className="mb-4">
                    <CopyBenefitCodeTA code={item.promo_code} />
                  </div>
                )}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-3.5 shrink-0" />
                    {kind === "promotions"
                      ? `${formatDate(item.start_date ?? "")} – ${formatDate(item.end_date ?? "")}`
                      : item.valid_until
                        ? `Hasta ${formatDate(item.valid_until)}`
                        : kind === "plans"
                          ? "Vigencia según el período contratado"
                          : "Sin fecha de vencimiento"}
                  </p>
                  <p>
                    {services.length
                      ? services.join(" · ")
                      : "Todos los servicios del negocio"}
                  </p>
                  {kind === "promotions" && (
                    <p>
                      {item.per_user_limit
                        ? `Máximo ${item.per_user_limit} usos por cliente`
                        : "Sin límite por cliente"}
                      {Number(item.min_purchase) > 0
                        ? ` · Compra mínima ${formatCurrency(Number(item.min_purchase))}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="mt-5 flex gap-2 border-t border-border pt-4">
                  <ButtonTA
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      navigate(
                        benefitAdminPath(
                          kind,
                          data.business_id,
                          `/${item.id}/edit`,
                        ),
                      )
                    }
                  >
                    <Pencil />
                    Editar
                  </ButtonTA>
                  <ButtonTA
                    variant="ghost"
                    size="icon"
                    aria-label={`Pausar ${item.name ?? item.title}`}
                    disabled={!(item.active ?? item.is_active) || removal.busy}
                    onClick={() => removal.select(item)}
                  >
                    <Archive />
                  </ButtonTA>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card">
          <StateTA
            title={
              records.total
                ? "Sin coincidencias"
                : `Aún no tienes ${config.section.toLocaleLowerCase()}`
            }
            description={
              records.total
                ? "Ajusta los filtros para encontrar el beneficio."
                : "Crea tu primer beneficio y publícalo en el catálogo de tus clientes."
            }
          />
          <div className="flex justify-center pb-6">
            <ButtonTA
              onClick={() =>
                records.total
                  ? filters.reset()
                  : navigate(benefitAdminPath(kind, data.business_id, "/new"))
              }
            >
              {records.total ? "Limpiar filtros" : config.create}
            </ButtonTA>
          </div>
        </div>
      )}
    </section>
  );
};
