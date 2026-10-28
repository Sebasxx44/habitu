import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Scissors,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import {
  appointmentStatus,
  clientAppointmentDate,
  clientAppointmentTime,
  clientDate,
  clientInitials,
  clientMoney,
} from "@/modules/clients/utils";
import type { ClientProfileState } from "@/modules/clients/types";
import { cn } from "@/lib/utils";

// TYPES
interface ClientProfileProps {
  profile: ClientProfileState;
}

// COMPONENT
export const ClientProfileTA = ({ profile }: ClientProfileProps) => {
  const { record, history, metrics } = profile;
  const client = record.client;
  if (!client) return null;
  const historyUnavailable = history.loading || !!history.error;
  const tabs: {
    value: ClientProfileState["history"]["filter"];
    label: string;
  }[] = [
    { value: "all", label: "Todas" },
    { value: "upcoming", label: "Próximas" },
    { value: "completed", label: "Completadas" },
    { value: "cancelled", label: "Canceladas / ausencias" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <ButtonTA
        variant="ghost"
        className="-ml-3"
        render={<Link to="/admin/clients" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-4" /> Volver a clientes
      </ButtonTA>
      <ActionHeaderTA
        eyebrow="Directorio / Perfil del cliente"
        title={client.name}
        description={`Cliente desde el ${clientDate(client.created_at)}. Cada visita cuenta.`}
        actions={
          <>
            <ButtonTA
              variant="outline"
              render={<Link to={`/admin/clients/${client.id}/edit`} />}
              nativeButton={false}
            >
              <Pencil className="size-4" /> Editar perfil
            </ButtonTA>
            <ButtonTA
              render={
                <Link to={`/admin/calendar/new?client_id=${client.id}`} />
              }
              nativeButton={false}
            >
              <CalendarPlus className="size-4" /> Nueva reserva
            </ButtonTA>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Visitas completadas",
            value: metrics.completed,
            hint: "Servicios finalizados",
          },
          {
            label: "Valor de sus visitas",
            value: clientMoney(metrics.spent),
            hint: "Importe de reservas completadas",
          },
          {
            label: "Próximas reservas",
            value: metrics.upcoming,
            hint: "Pendientes o confirmadas",
          },
          {
            label: "Última visita",
            value: metrics.lastVisit
              ? clientDate(metrics.lastVisit)
              : "Aún sin visitas",
            hint: "Último servicio completado",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-border bg-card p-4 sm:p-5"
          >
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-3 break-words text-xl font-semibold tracking-tight tabular-nums xl:text-2xl">
              {historyUnavailable ? "—" : metric.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {metric.hint}
            </p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <PanelTA
            title="Datos de contacto"
            action={
              client.is_vip ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  <Star className="size-3" /> VIP
                </span>
              ) : undefined
            }
          >
            <div className="space-y-4 px-5 pb-6 md:px-6">
              <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
                {clientInitials(client.name)}
              </span>
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">
                  Correo electrónico
                </p>
                {client.email ? (
                  <a
                    className="flex min-w-0 items-center gap-2 text-sm hover:text-primary"
                    href={`mailto:${client.email}`}
                  >
                    <Mail className="size-4 shrink-0" />
                    <span className="break-all">{client.email}</span>
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin correo registrado
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">
                  Teléfono
                </p>
                {client.phone ? (
                  <a
                    className="flex items-center gap-2 text-sm hover:text-primary"
                    href={`tel:${client.phone}`}
                  >
                    <Phone className="size-4" />
                    {client.phone}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin teléfono registrado
                  </p>
                )}
              </div>
              {typeof client.loyalty_points === "number" && (
                <div className="border-t border-border pt-4">
                  <p className="text-[11px] text-muted-foreground">
                    Puntos de fidelidad
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {client.loyalty_points}
                  </p>
                </div>
              )}
            </div>
          </PanelTA>
          <PanelTA
            title="Notas del equipo"
            action={
              <ButtonTA
                variant="ghost"
                size="icon"
                aria-label="Editar notas"
                render={<Link to={`/admin/clients/${client.id}/edit`} />}
                nativeButton={false}
              >
                <Pencil className="size-4" />
              </ButtonTA>
            }
          >
            <p className="whitespace-pre-wrap break-words px-5 pb-6 text-sm leading-relaxed text-muted-foreground md:px-6">
              {client.notes ||
                "Aún no hay notas. Añade preferencias de atención para personalizar su próxima visita."}
            </p>
          </PanelTA>
          <ButtonTA
            variant="ghost"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            render={<Link to={`/admin/clients/${client.id}/delete`} />}
            nativeButton={false}
          >
            <Trash2 className="size-4" /> Eliminar cliente
          </ButtonTA>
        </aside>
        <PanelTA
          title="Historial de reservas"
          description={`${history.loading ? "Cargando" : history.appointments.length} reservas registradas en tu negocio.`}
          action={<CalendarCheck className="size-5 text-primary" />}
        >
          <div className="flex flex-wrap gap-2 border-b border-border px-5 pb-5 md:px-6">
            {tabs.map((tab) => (
              <ButtonTA
                key={tab.value}
                variant={history.filter === tab.value ? "default" : "outline"}
                className="min-h-9 rounded-lg text-xs"
                size="sm"
                aria-pressed={history.filter === tab.value}
                onClick={() => history.setFilter(tab.value)}
              >
                {tab.label}
              </ButtonTA>
            ))}
          </div>
          {history.error ? (
            <StateTA
              error
              title="No se pudo cargar el historial"
              description={history.error}
              onRetry={record.reload}
            />
          ) : history.loading ? (
            <div
              className="space-y-3 p-6"
              role="status"
              aria-label="Cargando reservas"
            >
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : history.visible.length === 0 ? (
            <StateTA
              title="Sin reservas en esta vista"
              description={
                history.filter === "all"
                  ? "Crea la primera reserva de este cliente para comenzar su historial."
                  : "Prueba otra categoría para consultar el resto de sus reservas."
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {history.visible.map((appointment) => (
                <li key={appointment.id} className="p-5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                        <Scissors className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {appointment.service?.name ||
                            `Servicio #${appointment.service?.id || appointment.id}`}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {clientDate(
                            clientAppointmentDate(appointment),
                          )} · {clientAppointmentTime(appointment)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {clientMoney(
                          Number(
                            appointment.final_price ?? appointment.price ?? 0,
                          ),
                        )}
                      </p>
                      <span
                        className={cn(
                          "mt-1.5 inline-flex rounded-md px-2 py-1 text-[10px] font-medium",
                          appointmentStatus[appointment.status]?.className,
                        )}
                      >
                        {appointmentStatus[appointment.status]?.label ||
                          appointment.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 pl-[52px] text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <UserRound className="size-3" />
                      {appointment.professional?.name ||
                        "Sin profesional asignado"}
                    </span>
                    {appointment.branch?.name && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3" />
                        {appointment.branch.name}
                      </span>
                    )}
                    <ButtonTA
                      render={<Link to={`/admin/calendar/${appointment.id}`} />}
                      nativeButton={false}
                      variant="ghost"
                      size="sm"
                      className="ml-auto min-h-9 text-primary"
                      aria-label={`Ver reserva ${appointment.id}`}
                    >
                      Ver reserva <ArrowUpRight className="size-3.5" />
                    </ButtonTA>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {history.hasMore && (
            <div className="border-t border-border p-4 text-center">
              <ButtonTA variant="outline" onClick={history.loadMore}>
                Ver más reservas
              </ButtonTA>
            </div>
          )}
        </PanelTA>
      </div>
    </div>
  );
};
