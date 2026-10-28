import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Copy,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Settings2,
  Tag,
  X,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { StateTA } from "@/components/TA/StateTA";
import { ServiceMetricTA } from "@/modules/services/admin/ServiceMetricTA";
import { useServiceCatalog } from "@/modules/services/admin/useServiceCatalog";
import { serviceBookingLabel } from "@/modules/services/admin/servicePresentation";
import { formatCurrency } from "@/i18n/formatters";
import { cn } from "@/lib/utils";
import type { ServicesDataState } from "@/modules/services/admin/types";

// COMPONENT
export const ServicesCatalogTA = ({ data }: { data: ServicesDataState }) => {
  const navigate = useNavigate();
  const { filters, results, actions } = useServiceCatalog(
    data.catalog.services,
  );
  return (
    <div className="space-y-6 pb-10">
      <ActionHeaderTA
        eyebrow="Operación · Catálogo"
        title="Servicios"
        description="Una oferta clara, fácil de reservar y lista para crecer."
        actions={
          <>
            <ButtonTA
              variant="outline"
              disabled={data.status.refreshing}
              onClick={() => void data.actions.refresh()}
              aria-label="Actualizar servicios"
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  data.status.refreshing && "animate-spin",
                )}
              />
            </ButtonTA>
            <ButtonTA onClick={() => navigate("/admin/services/new")}>
              <Plus className="size-4" />
              Nuevo servicio
            </ButtonTA>
          </>
        }
      />
      {data.status.error && (
        <StateTA
          error
          title="No se pudo actualizar el catálogo"
          description={data.status.error}
          onRetry={() => void data.actions.refresh()}
        />
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ServiceMetricTA
          label="Servicios activos"
          value={results.active}
          hint={`${results.total - results.active} inactivos · ${results.total} en total`}
          icon={CheckCircle2}
        />
        <ServiceMetricTA
          label="Categorías"
          value={results.categories.length}
          hint="Organiza tu oferta"
          icon={Tag}
        />
        <ServiceMetricTA
          label="Precio promedio"
          value={results.total ? formatCurrency(results.averagePrice) : "—"}
          hint="Precio base del catálogo"
          icon={Scissors}
        />
        <ServiceMetricTA
          label="Duración promedio"
          value={results.total ? `${results.averageDuration} min` : "—"}
          hint="Tiempo base por servicio"
          icon={Clock}
        />
      </div>
      <section
        aria-label="Buscar y filtrar servicios"
        className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar servicios</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <InputTA
              className="pl-10"
              placeholder="Buscar por nombre, descripción o categoría…"
              value={filters.search}
              onChange={(event) => actions.filter("q", event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Categoría
            <select
              aria-label="Filtrar por categoría"
              value={filters.category}
              onChange={(event) =>
                actions.filter("category", event.target.value)
              }
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground lg:w-44"
            >
              <option value="">Todas</option>
              {results.categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Ordenar
            <select
              aria-label="Ordenar servicios"
              value={filters.sort}
              onChange={(event) => actions.filter("sort", event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="name">Nombre A–Z</option>
              <option value="price-asc">Menor precio</option>
              <option value="price-desc">Mayor precio</option>
              <option value="duration">Menor duración</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Estado del servicio"
          >
            {(
              [
                { key: "all", label: "Todos", count: results.total },
                { key: "active", label: "Activos", count: results.active },
                {
                  key: "inactive",
                  label: "Inactivos",
                  count: results.total - results.active,
                },
              ] as const
            ).map((status) => (
              <ButtonTA
                key={status.key}
                size="sm"
                variant={filters.status === status.key ? "secondary" : "ghost"}
                aria-pressed={filters.status === status.key}
                onClick={() => actions.filter("status", status.key)}
              >
                {status.label}
                <span className="ml-1 rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                  {status.count}
                </span>
              </ButtonTA>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {filters.applied && (
              <ButtonTA variant="ghost" size="sm" onClick={actions.reset}>
                <X className="size-3.5" />
                Limpiar
              </ButtonTA>
            )}
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {results.services.length} resultados
            </span>
            <div className="flex gap-1 border-l border-border pl-2">
              <ButtonTA
                size="icon"
                variant={filters.layout === "grid" ? "secondary" : "ghost"}
                aria-label="Vista de tarjetas"
                aria-pressed={filters.layout === "grid"}
                onClick={() => actions.filter("layout", "grid")}
              >
                <LayoutGrid className="size-4" />
              </ButtonTA>
              <ButtonTA
                size="icon"
                variant={filters.layout === "list" ? "secondary" : "ghost"}
                aria-label="Vista de lista"
                aria-pressed={filters.layout === "list"}
                onClick={() => actions.filter("layout", "list")}
              >
                <List className="size-4" />
              </ButtonTA>
            </div>
          </div>
        </div>
      </section>
      {results.services.length ? (
        <div
          className={cn(
            "grid gap-4",
            filters.layout === "grid" && "md:grid-cols-2 2xl:grid-cols-3",
          )}
        >
          {results.services.map((service) => (
            <article
              key={service.id}
              className={cn(
                "overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md",
                filters.layout === "list" && "sm:flex sm:items-center",
              )}
            >
              <div
                className={cn(
                  "flex gap-4 p-5",
                  filters.layout === "list" && "min-w-0 flex-1",
                )}
              >
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt=""
                    width={72}
                    height={72}
                    loading="lazy"
                    decoding="async"
                    className="size-[72px] shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid size-[72px] shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Scissors className="size-7" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {service.category || "General"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        service.is_active === false
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {service.is_active === false ? "Inactivo" : "Activo"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/services/${service.id}`)}
                    className="block text-left text-base font-semibold tracking-tight hover:text-primary focus-visible:rounded focus-visible:outline focus-visible:outline-primary"
                  >
                    {service.name}
                  </button>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {service.description ||
                      "Añade una descripción para ayudar a tus clientes a elegir."}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "grid grid-cols-2 gap-4 px-5 pb-4",
                  filters.layout === "list" && "sm:w-64 sm:shrink-0 sm:py-5",
                )}
              >
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Precio base
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight">
                    {formatCurrency(service.price)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Duración</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="size-3.5 text-muted-foreground" />
                    {service.duration_minutes ?? service.duration} min
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2",
                  filters.layout === "list" &&
                    "sm:max-w-72 sm:border-l sm:border-t-0 sm:py-4",
                )}
              >
                <span className="text-[11px] text-muted-foreground">
                  {serviceBookingLabel(service)}
                </span>
                <div className="flex gap-1">
                  <ButtonTA
                    variant="ghost"
                    size="icon"
                    aria-label={`Configurar ${service.name}`}
                    onClick={() =>
                      navigate(`/admin/services/${service.id}/settings`)
                    }
                  >
                    <Settings2 className="size-4" />
                  </ButtonTA>
                  <ButtonTA
                    variant="ghost"
                    size="icon"
                    aria-label={`Duplicar ${service.name}`}
                    onClick={() =>
                      navigate(`/admin/services/new?copy=${service.id}`)
                    }
                  >
                    <Copy className="size-4" />
                  </ButtonTA>
                  <ButtonTA
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/admin/services/${service.id}`)}
                  >
                    Ver ficha
                    <ArrowUpRight className="size-4" />
                  </ButtonTA>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card">
          <StateTA
            title={
              results.total
                ? "No encontramos servicios"
                : "Crea tu primer servicio"
            }
            description={
              results.total
                ? "Prueba otro nombre o ajusta los filtros del catálogo."
                : "Define el precio, la duración y las reglas para empezar a recibir reservas."
            }
          />
          <div className="flex justify-center pb-8">
            <ButtonTA
              onClick={
                results.total
                  ? actions.reset
                  : () => navigate("/admin/services/new")
              }
            >
              {results.total ? "Limpiar filtros" : "Crear servicio"}
            </ButtonTA>
          </div>
        </div>
      )}
    </div>
  );
};
