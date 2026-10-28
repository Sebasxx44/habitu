import { ArrowLeft, CalendarPlus, Clock3, Save } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { InputTA } from "@/components/TA/InputTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import {
  calendarSlotKey,
  useCalendarBooking,
} from "@/modules/calendar/composables/useCalendarBooking";
import {
  calendarAmount,
  calendarToday,
} from "@/modules/calendar/calendarModel";
import { cn } from "@/lib/utils";

// CONSTANTS
const selectClass =
  "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm";

// COMPONENT
export const CalendarBookingTA = () => {
  const { form, options, schedule, submission } = useCalendarBooking();
  const { permissions, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canCreate =
    user?.role === "SUPERADMIN" || permissions.includes("appointments.create");
  const service = schedule.service;
  const model =
    service?.booking_model ||
    (service?.requires_professional === false ? "direct" : "professional");
  const resourceBooking = model === "resource";
  const supportsProfessional =
    model === "professional" ||
    model === "optional_professional" ||
    (resourceBooking && service?.resource_professional_optional === true);
  const returnTo = `/admin/calendar${location.search}`;
  return (
    <div className="space-y-6 pb-10">
      <ActionHeaderTA
        eyebrow="Calendario / Nueva reserva"
        title="Prepara la próxima visita"
        description="Elige el cliente, el servicio y uno de los horarios disponibles."
        actions={
          <ButtonTA
            variant="outline"
            disabled={submission.saving}
            onClick={() => navigate(returnTo)}
          >
            <ArrowLeft className="size-4" />
            Calendario
          </ButtonTA>
        }
      />
      {!canCreate ? (
        <StateTA
          title="Acceso de consulta"
          description="Tu cuenta no tiene permiso para crear reservas."
        />
      ) : options.loading ? (
        <StateTA
          title="Preparando la reserva"
          description="Cargando clientes, servicios y equipo…"
        />
      ) : options.error ? (
        <StateTA
          error
          title="Datos no disponibles"
          description={options.error}
          onRetry={options.retry}
        />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submission.submit();
          }}
          className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
        >
          <fieldset disabled={submission.saving} className="min-w-0 space-y-5">
            <PanelTA
              title="1. Cliente y servicio"
              description="Todos los campos de selección son necesarios para consultar horarios."
            >
              <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Cliente
                  <select
                    required
                    className={selectClass}
                    value={form.values.clientId}
                    onChange={(event) =>
                      form.set("clientId", event.target.value)
                    }
                  >
                    <option value="">Selecciona un cliente</option>
                    {options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                        {client.phone ? ` · ${client.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Servicio
                  <select
                    required
                    className={selectClass}
                    value={form.values.serviceId}
                    onChange={(event) =>
                      form.set("serviceId", event.target.value)
                    }
                  >
                    <option value="">Selecciona un servicio</option>
                    {options.services.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.duration_minutes || item.duration}{" "}
                        min
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Sede
                  <select
                    required
                    className={selectClass}
                    value={form.values.branchId}
                    onChange={(event) =>
                      form.set("branchId", event.target.value)
                    }
                  >
                    <option value="">Selecciona una sede</option>
                    {options.branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                {supportsProfessional && (
                  <label className="text-sm font-medium">
                    Profesional
                    <select
                      className={selectClass}
                      value={form.values.professionalId}
                      onChange={(event) =>
                        form.set("professionalId", event.target.value)
                      }
                    >
                      <option value="">Asignar según disponibilidad</option>
                      {options.professionals.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {resourceBooking && (
                  <label className="text-sm font-medium">
                    Recurso
                    <select
                      className={selectClass}
                      value={form.values.resourceId}
                      onChange={(event) =>
                        form.set("resourceId", event.target.value)
                      }
                    >
                      <option value="">Cualquier recurso disponible</option>
                      {options.resources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {service?.duration_mode === "selectable" && (
                  <label className="text-sm font-medium">
                    Duración
                    <select
                      className={selectClass}
                      value={
                        form.values.duration ||
                        String(service.duration_minutes || service.duration)
                      }
                      onChange={(event) =>
                        form.set("duration", event.target.value)
                      }
                    >
                      {[
                        ...new Set([
                          service.duration_minutes || service.duration,
                          ...(service.duration_options || []),
                        ]),
                      ].map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} minutos
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {service?.booking_model === "capacity" && (
                  <label className="text-sm font-medium">
                    Participantes
                    <InputTA
                      className="mt-2"
                      type="number"
                      required
                      min={1}
                      max={service.booking_capacity || 10000}
                      value={form.values.participants}
                      onChange={(event) =>
                        form.set("participants", event.target.value)
                      }
                    />
                  </label>
                )}
                {!options.clients.length && (
                  <p className="text-sm text-muted-foreground">
                    Primero registra un cliente en el módulo de Clientes.
                  </p>
                )}
              </div>
            </PanelTA>
            <PanelTA
              title="2. Fecha y horario"
              description="Disponibilidad actualizada. Hora de Colombia (UTC−5)."
            >
              <div className="space-y-4 px-5 pb-5">
                <label className="block max-w-xs text-sm font-medium">
                  Fecha
                  <InputTA
                    required
                    type="date"
                    min={calendarToday()}
                    value={form.values.date}
                    className="mt-2"
                    onChange={(event) => form.set("date", event.target.value)}
                  />
                </label>
                {!service || !form.values.branchId ? (
                  <StateTA
                    title="Elige servicio y sede"
                    description="Después podrás consultar los horarios de atención disponibles."
                  />
                ) : schedule.loading ? (
                  <p
                    role="status"
                    className="py-6 text-sm text-muted-foreground"
                  >
                    Consultando disponibilidad…
                  </p>
                ) : schedule.error ? (
                  <StateTA
                    error
                    title="No pudimos consultar horarios"
                    description={schedule.error}
                    onRetry={schedule.reload}
                  />
                ) : !schedule.slots.length ? (
                  <StateTA
                    title="No quedan horarios disponibles"
                    description="Prueba otra fecha, sede o profesional."
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {schedule.slots.map((slot) => (
                      <ButtonTA
                        key={calendarSlotKey(slot)}
                        type="button"
                        variant="outline"
                        aria-pressed={
                          form.values.slotKey === calendarSlotKey(slot)
                        }
                        className={cn(
                          "h-auto flex-col items-start gap-1 p-3 text-left",
                          form.values.slotKey === calendarSlotKey(slot) &&
                            "border-primary bg-primary/5 text-primary",
                        )}
                        onClick={() =>
                          form.set("slotKey", calendarSlotKey(slot))
                        }
                      >
                        <span className="flex items-center gap-2 text-sm">
                          <Clock3 className="size-3.5" />
                          {slot.start_time.slice(0, 5)}
                        </span>
                        <span className="max-w-full truncate text-[11px] font-normal text-muted-foreground">
                          {slot.professional_name ||
                            slot.resource_name ||
                            `Hasta ${slot.end_time.slice(0, 5)}`}
                        </span>
                      </ButtonTA>
                    ))}
                  </div>
                )}
              </div>
            </PanelTA>
            <PanelTA
              title="3. Indicaciones"
              description="Estas notas también pueden ser visibles para el cliente."
            >
              <div className="px-5 pb-5">
                <label className="sr-only" htmlFor="booking-notes">
                  Notas de la reserva
                </label>
                <textarea
                  id="booking-notes"
                  rows={3}
                  maxLength={2000}
                  value={form.values.notes}
                  onChange={(event) => form.set("notes", event.target.value)}
                  placeholder="Preferencias o información para preparar el servicio…"
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                />
              </div>
            </PanelTA>
          </fieldset>
          <aside className="space-y-4 lg:sticky lg:top-5">
            <PanelTA title="Resumen de la reserva">
              <div className="space-y-4 px-5 pb-5">
                <CalendarPlus className="size-8 text-primary" />
                <p className="font-semibold">
                  {service?.name || "Selecciona un servicio"}
                </p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Cliente</dt>
                    <dd className="mt-1">
                      {options.clients.find(
                        (client) => String(client.id) === form.values.clientId,
                      )?.name || "Por seleccionar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Fecha y hora
                    </dt>
                    <dd className="mt-1">
                      {form.values.date} ·{" "}
                      {schedule.selected?.start_time.slice(0, 5) ||
                        "Por seleccionar"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Precio de referencia
                    </dt>
                    <dd className="mt-1 text-xl font-semibold">
                      {service
                        ? calendarAmount(
                            schedule.selected?.price ?? Number(service.price),
                          )
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  El valor final y la disponibilidad se validan al guardar la
                  reserva.
                </p>
                {submission.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {submission.error}
                  </p>
                )}
                <ButtonTA
                  type="submit"
                  className="w-full"
                  disabled={
                    submission.saving ||
                    !schedule.selected ||
                    schedule.loading ||
                    !!schedule.error ||
                    !form.values.clientId
                  }
                >
                  <Save className="size-4" />
                  {submission.saving ? "Creando…" : "Crear reserva"}
                </ButtonTA>
                <ButtonTA
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={submission.saving}
                  onClick={() => navigate(returnTo)}
                >
                  Volver sin guardar
                </ButtonTA>
              </div>
            </PanelTA>
          </aside>
        </form>
      )}
    </div>
  );
};
