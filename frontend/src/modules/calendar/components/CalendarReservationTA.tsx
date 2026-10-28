import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { StateTA } from "@/components/TA/StateTA";
import { AppointmentDetailView } from "@/components/premium/AppointmentDetailView";
import { useAppointmentDetail } from "@/composables/appointments/useAppointmentDetail";
import { httpService } from "@/services/auth/authService";
import { calendarStatus } from "@/modules/calendar/calendarModel";
import { useCalendarProfessionals } from "@/modules/calendar/composables/useCalendarProfessionals";

// CONSTANTS
const statusApi: Record<string, string> = {
  CONFIRMADA: "CONFIRMED",
  NO_ASISTIO: "NO_SHOW",
};

// COMPONENT
export const CalendarReservationTA = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { detail, actions } = useAppointmentDetail(Number(id));
  const professionals = useCalendarProfessionals();
  const appointment = detail.data;
  const back = () => navigate(`/admin/calendar${location.search}`);
  const changeStatus = async (
    appointmentId: number,
    status: string,
    reason?: string,
  ) => {
    if (status === "CANCELADA")
      await httpService.post(`/v2/appointments/${appointmentId}/cancel`, {
        reason,
      });
    else if (status === "COMPLETADA")
      await httpService.post(`/v2/appointments/${appointmentId}/complete`, {});
    else if (statusApi[status])
      await httpService.put(`/v2/appointments/${appointmentId}`, {
        status: statusApi[status],
      });
    actions.reload();
  };
  return (
    <div className="space-y-6 pb-10">
      <ActionHeaderTA
        eyebrow="Calendario / Reserva"
        title={appointment?.booking_code || `Reserva ${id || ""}`}
        description={
          appointment
            ? `${appointment.service?.name || "Servicio"} · ${calendarStatus[appointment.status].label}`
            : "Consulta la información y gestiona la reserva."
        }
        actions={
          <ButtonTA variant="outline" onClick={back}>
            <ArrowLeft className="size-4" />
            Calendario
          </ButtonTA>
        }
      />
      {detail.loading ? (
        <StateTA
          title="Cargando reserva"
          description="Consultando información, pagos y actividad…"
        />
      ) : detail.error || !appointment ? (
        <StateTA
          error
          title="Reserva no disponible"
          description={detail.error || "No encontramos esta reserva."}
          onRetry={actions.reload}
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <section className="min-w-0 rounded-2xl border border-border bg-card">
            <AppointmentDetailView
              key={appointment.id}
              appt={appointment}
              barbers={professionals.data}
              onClose={back}
              onStatusChange={changeStatus}
            />
          </section>
          <aside className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Información relacionada</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Abre una ficha para consultar contacto, historial o configuración.
            </p>
            {appointment.client?.id && (
              <ButtonTA
                variant="outline"
                className="w-full justify-between"
                onClick={() =>
                  navigate(`/admin/clients/${appointment.client?.id}`)
                }
              >
                Ficha del cliente
                <ExternalLink className="size-3.5" />
              </ButtonTA>
            )}
            {(appointment.professional_id || appointment.barber_id) && (
              <ButtonTA
                variant="outline"
                className="w-full justify-between"
                onClick={() =>
                  navigate(
                    `/admin/professionals/${appointment.professional_id || appointment.barber_id}`,
                  )
                }
              >
                Profesional
                <ExternalLink className="size-3.5" />
              </ButtonTA>
            )}
            <ButtonTA
              variant="outline"
              className="w-full justify-between"
              onClick={() =>
                navigate(`/admin/services/${appointment.service_id}`)
              }
            >
              Servicio
              <ExternalLink className="size-3.5" />
            </ButtonTA>
            {professionals.error && (
              <p className="text-xs text-destructive">{professionals.error}</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
