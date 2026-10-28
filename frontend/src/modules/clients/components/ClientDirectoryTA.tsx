import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { useClients } from "@/composables/useClients";
import { clientDate, clientInitials } from "@/modules/clients/utils";
import type { ClientSegment, ClientSort } from "@/modules/clients/types";
import { cn } from "@/lib/utils";

// TYPES
interface ClientDirectoryProps {
  businessId?: number | null;
  businessName: string;
}

// COMPONENT
export const ClientDirectoryTA = ({
  businessId,
  businessName,
}: ClientDirectoryProps) => {
  const { directory, filters, metrics, actions } = useClients(businessId);
  const segments: { value: ClientSegment; label: string; count: number }[] = [
    { value: "all", label: "Todos", count: metrics.total },
    { value: "new", label: "Nuevos este mes", count: metrics.newThisMonth },
    {
      value: "incomplete",
      label: "Contacto incompleto",
      count: metrics.total - metrics.complete,
    },
    { value: "vip", label: "VIP", count: metrics.vip },
  ];

  return (
    <div className="space-y-6 pb-8">
      <ActionHeaderTA
        eyebrow="Relaciones que crecen"
        title="Clientes"
        description={`Conoce a cada cliente y prepara su próxima visita a ${businessName}.`}
        actions={
          <>
            <ButtonTA
              variant="outline"
              onClick={actions.exportCsv}
              disabled={
                directory.loading ||
                !!directory.error ||
                !directory.filtered.length
              }
            >
              <Download className="size-4" /> Exportar
            </ButtonTA>
            <ButtonTA
              render={<Link to="/admin/clients/new" />}
              nativeButton={false}
            >
              <Plus className="size-4" /> Nuevo cliente
            </ButtonTA>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Clientes registrados",
            value: metrics.total,
            subtitle: "Tu comunidad, en un solo lugar",
            icon: Users,
            color: "text-primary bg-primary/10",
            segment: "all" as const,
          },
          {
            label: "Nuevos este mes",
            value: metrics.newThisMonth,
            subtitle: "Registros del mes actual",
            icon: UserPlus,
            color: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300",
            segment: "new" as const,
          },
          {
            label: "Contacto completo",
            value: metrics.complete,
            subtitle: "Con correo y teléfono",
            icon: ShieldCheck,
            color: "text-sky-700 bg-sky-500/10 dark:text-sky-300",
            segment: "all" as const,
          },
          {
            label: "Clientes VIP",
            value: metrics.vip,
            subtitle: "Reconocidos en tu negocio",
            icon: Star,
            color: "text-amber-700 bg-amber-500/10 dark:text-amber-300",
            segment: "vip" as const,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  metric.color,
                )}
              >
                <metric.icon className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              {directory.loading && !directory.clients.length
                ? "—"
                : directory.error
                  ? "—"
                  : metric.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {metric.subtitle}
            </p>
          </div>
        ))}
      </div>

      <PanelTA
        title="Directorio de clientes"
        description="Datos de contacto, perfiles e historial de reservas."
        action={
          <ButtonTA
            variant="ghost"
            size="sm"
            onClick={directory.refresh}
            disabled={directory.loading}
          >
            <RefreshCw
              className={cn("size-4", directory.loading && "animate-spin")}
            />{" "}
            Actualizar
          </ButtonTA>
        }
      >
        <div className="space-y-4 border-b border-border px-5 pb-5 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <InputTA
                aria-label="Buscar clientes"
                className="pl-10 pr-10"
                placeholder="Buscar por nombre, correo o teléfono…"
                value={filters.search}
                onChange={(event) => filters.setSearch(event.target.value)}
              />
              {filters.search && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-0 top-0 grid size-11 place-items-center rounded-xl text-muted-foreground focus-visible:outline focus-visible:outline-primary"
                  onClick={() => filters.setSearch("")}
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm">
              <span className="text-muted-foreground">Ordenar</span>
              <select
                className="min-w-0 flex-1 bg-transparent py-2 focus-visible:outline-primary"
                aria-label="Orden de clientes"
                value={filters.sort}
                onChange={(event) =>
                  filters.setSort(event.target.value as ClientSort)
                }
              >
                <option value="recent">Más recientes</option>
                <option value="name">Nombre A–Z</option>
                <option value="oldest">Más antiguos</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar clientes">
            {segments.map((segment) => (
              <ButtonTA
                key={segment.value}
                variant={
                  filters.segment === segment.value ? "default" : "outline"
                }
                size="sm"
                className="min-h-9 rounded-lg text-xs"
                aria-pressed={filters.segment === segment.value}
                onClick={() => filters.setSegment(segment.value)}
              >
                {segment.label}
                <span
                  className={cn(
                    "ml-1 rounded px-1.5 py-0.5 text-[10px] tabular-nums",
                    filters.segment === segment.value
                      ? "bg-white/15"
                      : "bg-secondary",
                  )}
                >
                  {directory.loading && !directory.clients.length
                    ? "—"
                    : segment.count}
                </span>
              </ButtonTA>
            ))}
          </div>
        </div>

        {directory.error ? (
          <StateTA
            error
            title="El directorio no está disponible"
            description={directory.error}
            onRetry={directory.refresh}
          />
        ) : directory.loading && !directory.clients.length ? (
          <div
            className="space-y-3 p-6"
            role="status"
            aria-label="Cargando clientes"
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : !directory.filtered.length ? (
          <div className="pb-6">
            <StateTA
              title={
                directory.clients.length
                  ? "No hay coincidencias"
                  : "Tu próximo vínculo empieza aquí"
              }
              description={
                directory.clients.length
                  ? "Prueba otro nombre, correo o teléfono, o restablece los filtros."
                  : "Registra tu primer cliente para centralizar sus datos y consultar cada reserva."
              }
            />
            <div className="flex justify-center">
              {directory.clients.length ? (
                <ButtonTA variant="outline" onClick={filters.clear}>
                  Restablecer filtros
                </ButtonTA>
              ) : (
                <ButtonTA
                  render={<Link to="/admin/clients/new" />}
                  nativeButton={false}
                >
                  <Plus /> Crear primer cliente
                </ButtonTA>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.3fr_1.15fr_0.85fr_120px] gap-4 border-b border-border bg-secondary/30 px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:grid">
              <span>Cliente</span>
              <span>Contacto</span>
              <span>En tu comunidad desde</span>
              <span className="text-right">Acciones</span>
            </div>
            <ul className="divide-y divide-border">
              {directory.visible.map((client) => (
                <li
                  key={client.id}
                  className="grid items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/20 sm:grid-cols-[1fr_auto] lg:grid-cols-[1.3fr_1.15fr_0.85fr_120px] md:px-6"
                >
                  <Link
                    to={`/admin/clients/${client.id}`}
                    className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-primary"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                      {clientInitials(client.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold group-hover:text-primary">
                          {client.name}
                        </span>
                        <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {client.is_vip ? (
                          <>
                            <Star className="size-3 text-amber-600" /> Cliente
                            VIP
                          </>
                        ) : client.phone && client.email ? (
                          <>
                            <Check className="size-3 text-emerald-600" />{" "}
                            Contacto completo
                          </>
                        ) : (
                          "Completar datos de contacto"
                        )}
                      </span>
                    </span>
                  </Link>
                  <div className="min-w-0 space-y-1.5 text-xs sm:col-span-2 sm:row-start-2 lg:col-span-1 lg:row-auto">
                    {client.email ? (
                      <a
                        className="flex min-w-0 items-center gap-2 text-muted-foreground hover:text-primary"
                        href={`mailto:${client.email}`}
                      >
                        <Mail className="size-3.5 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Sin correo</p>
                    )}
                    {client.phone ? (
                      <a
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                        href={`tel:${client.phone}`}
                      >
                        <Phone className="size-3.5 shrink-0" />
                        {client.phone}
                      </a>
                    ) : (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5" /> Sin teléfono
                      </p>
                    )}
                  </div>
                  <p className="hidden text-xs text-muted-foreground lg:block">
                    {clientDate(client.created_at)}
                  </p>
                  <div className="flex items-center gap-1 sm:col-start-2 sm:row-start-1 lg:col-auto lg:row-auto lg:justify-end">
                    <ButtonTA
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar a ${client.name}`}
                      title="Editar cliente"
                      render={<Link to={`/admin/clients/${client.id}/edit`} />}
                      nativeButton={false}
                    >
                      <Pencil className="size-4" />
                    </ButtonTA>
                    <ButtonTA
                      variant="outline"
                      size="icon"
                      aria-label={`Crear reserva para ${client.name}`}
                      title="Nueva reserva"
                      render={
                        <Link
                          to={`/admin/calendar/new?client_id=${client.id}`}
                        />
                      }
                      nativeButton={false}
                    >
                      <CalendarPlus className="size-4" />
                    </ButtonTA>
                    <ButtonTA
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver perfil de ${client.name}`}
                      title="Ver perfil"
                      render={<Link to={`/admin/clients/${client.id}`} />}
                      nativeButton={false}
                    >
                      <ChevronRight className="size-4" />
                    </ButtonTA>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 md:px-6">
              <p className="text-xs text-muted-foreground" role="status">
                {(filters.page - 1) * 12 + 1}–
                {Math.min(filters.page * 12, directory.filtered.length)} de{" "}
                {directory.filtered.length} clientes
              </p>
              <div className="flex items-center gap-2">
                <ButtonTA
                  variant="outline"
                  size="icon"
                  aria-label="Página anterior"
                  disabled={filters.page === 1}
                  onClick={() => filters.setPage(filters.page - 1)}
                >
                  <ChevronLeft className="size-4" />
                </ButtonTA>
                <span className="px-2 text-xs tabular-nums">
                  {filters.page} / {filters.pages}
                </span>
                <ButtonTA
                  variant="outline"
                  size="icon"
                  aria-label="Página siguiente"
                  disabled={filters.page === filters.pages}
                  onClick={() => filters.setPage(filters.page + 1)}
                >
                  <ChevronRight className="size-4" />
                </ButtonTA>
              </div>
            </div>
          </>
        )}
      </PanelTA>
      {metrics.total > metrics.complete && !directory.error && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <span className="mt-0.5 text-primary">
              <Phone className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">
                Un contacto completo facilita la próxima visita
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.total - metrics.complete} clientes tienen pendiente un
                teléfono o correo.
              </p>
            </div>
          </div>
          <ButtonTA
            variant="ghost"
            className="text-primary"
            onClick={() => {
              filters.setSearch("");
              filters.setSegment("incomplete");
            }}
          >
            Revisar contactos <ArrowUpRight className="size-4" />
          </ButtonTA>
        </div>
      )}
    </div>
  );
};
