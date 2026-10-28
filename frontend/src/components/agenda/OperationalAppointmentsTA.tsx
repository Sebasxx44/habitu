import { useRequestedAppointment } from "@/modules/agenda/composables/useRequestedAppointment";
import { useState } from "react";
import { useAuth } from "@/App";
import { useNavigate } from "react-router-dom";
import { CalendarDays, RefreshCw, SlidersHorizontal } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { PremiumModal } from "@/components/premium/PremiumModal";
import { AppointmentDetailView } from "@/components/premium/AppointmentDetailView";
import { Skeleton } from "@/components/ui/skeleton";
import { useOperationalAgenda } from "@/composables/useOperationalAgenda";
import type { ClientAppointment } from "@/composables/appointments/types";
import { formatDate, formatTime } from "@/utils/dateUtils";

import { BusinessAgendaInsightsTA } from "@/modules/agenda/components/BusinessAgendaInsightsTA";
import { InputTA } from "@/components/TA/InputTA";

// COMPONENT
export const OperationalAppointmentsTA = ({
  professional = false,
}: {
  professional?: boolean;
}) => {
  const navigate = useNavigate();
  const { user, permissions } = useAuth();
  const canManage =
    user?.role === "SUPERADMIN" || permissions.includes("appointments.edit");
  const { list, filters, options, actions } = useOperationalAgenda();
  const [selected, setSelected] = useState<ClientAppointment | null>(null);
  const requested = useRequestedAppointment(setSelected);
  const selectClass =
    "h-11 rounded-xl border border-border bg-background px-3 text-sm";
  return (
    <div className="space-y-7 pb-10">
      {requested.error && <p role="alert" className="text-sm text-destructive">No se pudo abrir la reserva solicitada. Verifica tu acceso y vuelve a intentar.</p>}
      <ActionHeaderTA
        eyebrow={professional ? "Tu jornada" : "Operación"}
        title={professional ? "Mis citas" : "Agenda de citas"}
        description="Consulta la agenda y gestiona cada reserva con información actualizada."
        actions={
          <>
            {!professional && (
              <ButtonTA
                variant="outline"
                onClick={() => navigate("/admin/calendar")}
              >
                <CalendarDays className="size-4" />
                Calendario
              </ButtonTA>
            )}
            <ButtonTA
              variant="outline"
              onClick={list.refresh}
              aria-label="Actualizar agenda"
            >
              <RefreshCw className="size-4" />
            </ButtonTA>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2" aria-label="Accesos rápidos de agenda">
        <ButtonTA variant="outline" onClick={() => actions.setPreset('today')}>Hoy</ButtonTA>
        <ButtonTA variant="outline" onClick={() => actions.setPreset('tomorrow')}>Mañana</ButtonTA>
        <ButtonTA variant="outline" onClick={() => actions.setPreset('week')}>Próximos 7 días</ButtonTA>
        <ButtonTA variant="outline" onClick={() => { actions.setPreset('week'); filters.setStatus('PENDING'); }}>Por confirmar</ButtonTA>
        <ButtonTA variant="ghost" onClick={actions.resetFilters}><SlidersHorizontal className="size-4" />Limpiar filtros</ButtonTA>
      </div>
      <section
        aria-label="Filtros de agenda"
        className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="text-xs text-muted-foreground">
          Buscar
          <InputTA
            aria-label="Buscar cliente, profesional o servicio"
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
            maxLength={100}
            placeholder="Cliente, profesional, servicio…"
            className={`${selectClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Estado
          <select
            value={filters.status}
            onChange={(event) => filters.setStatus(event.target.value)}
            className={`${selectClass} mt-2 w-full`}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="COMPLETED">Completadas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="NO_SHOW">Ausencias</option>
          </select>
        </label>
        {!professional && (
          <label className="text-xs text-muted-foreground">
            Profesional
            <select
              value={filters.professional}
              onChange={(event) => filters.setProfessional(event.target.value)}
              className={`${selectClass} mt-2 w-full`}
            >
              <option value="">Todo el equipo</option>
              {options.professionals.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs text-muted-foreground">
          Desde
          <InputTA
            type="date"
            value={filters.from}
            onChange={(event) => filters.setFrom(event.target.value)}
            className={`${selectClass} mt-2 w-full`}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta
          <InputTA
            type="date"
            value={filters.to}
            min={filters.from}
            onChange={(event) => filters.setTo(event.target.value)}
            className={`${selectClass} mt-2 w-full`}
          />
        </label>
        {options.branches.length > 0 && (
          <label className="text-xs text-muted-foreground">
            Sede
            <select
              value={filters.branch}
              onChange={(event) => filters.setBranch(event.target.value)}
              className={`${selectClass} mt-2 w-full`}
            >
              <option value="">Todas las sedes</option>
              {options.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>
      <p className="text-sm text-muted-foreground">{list.total} reservas encontradas · Abre una cita para ver pagos, notas e historial o gestionar su horario.</p>
      {list.loading ? (
        <div role="status" aria-label="Cargando agenda">
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : list.error ? (
        <StateTA
          error
          title="No se pudo cargar la agenda"
          description={list.error}
          onRetry={list.refresh}
        />
      ) : list.data.length === 0 ? (
        <StateTA
          title="No hay citas con estos filtros"
          description="Cambia el período o los filtros para consultar otras reservas."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">Cliente y servicio</th>
                <th className="p-4 font-medium">Fecha y hora</th>
                <th className="p-4 font-medium">Profesional</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Valor</th>
                <th className="p-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.data.map((appointment) => (
                <tr key={appointment.id} className="hover:bg-secondary/20">
                  <td className="p-4">
                    <p className="font-medium">
                      {appointment.client?.name || "Cliente"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {appointment.service?.name}
                    </p>
                  </td>
                  <td className="p-4">
                    <p>{formatDate(appointment.date)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(appointment.time)}
                    </p>
                  </td>
                  <td className="p-4">
                    {appointment.barber?.name || "Sin asignar"}<p className="mt-1 text-xs text-muted-foreground">{appointment.branch?.name || options.branches.find(branch => branch.id === appointment.branch_id)?.name || "Sede de la reserva"}</p>
                  </td>
                  <td className="p-4 text-xs">
                    <span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${appointment.status === "COMPLETADA" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : appointment.status === "CONFIRMADA" ? "bg-primary/10 text-primary" : appointment.status === "PENDIENTE" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-secondary text-muted-foreground"}`}>{appointment.status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="p-4 tabular-nums">
                    {new Intl.NumberFormat("es-CO", { style: "currency", currency: appointment.currency || "COP", maximumFractionDigits: 0 }).format(appointment.price)}<p className="mt-1 text-xs text-muted-foreground">{appointment.currency || "COP"} · {appointment.payment_status === "PAID" ? "Pagado" : "Revisar pago"}</p>
                  </td>
                  <td className="p-4">
                    <ButtonTA
                      variant="outline"
                      onClick={() => setSelected(appointment)}
                    >
                      {canManage ? "Gestionar" : "Ver detalle"}
                    </ButtonTA>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!list.loading && !list.error && list.total > 0 && (
        <nav
          aria-label="Paginación de agenda"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-muted-foreground">
            {list.total} citas · Página {filters.page} de {list.lastPage}
          </p>
          <div className="flex gap-2">
            <ButtonTA
              variant="outline"
              disabled={filters.page <= 1}
              onClick={() => filters.setPage(filters.page - 1)}
            >
              Anterior
            </ButtonTA>
            <ButtonTA
              variant="outline"
              disabled={filters.page >= list.lastPage}
              onClick={() => filters.setPage(filters.page + 1)}
            >
              Siguiente
            </ButtonTA>
          </div>
        </nav>
      )}
      {!professional && user?.barber_shop_id && <BusinessAgendaInsightsTA businessId={user.barber_shop_id} />}
      <PremiumModal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title="Gestionar cita"
        maxWidth="sm:max-w-3xl"
        padding={false}
      >
        {selected && (
          <AppointmentDetailView
            key={selected.id}
            appt={selected}
            barbers={options.professionals}
            onClose={() => setSelected(null)}
            onStatusChange={async (id, status, reason) => {
              await actions.changeStatus(id, status, reason);
            }}
          />
        )}
      </PremiumModal>
    </div>
  );
};
