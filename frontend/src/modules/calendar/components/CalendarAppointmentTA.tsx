import { useLocation, useNavigate } from "react-router-dom";
import type { ClientAppointment } from "@/composables/appointments/types";
import { calendarStatus } from "@/modules/calendar/calendarModel";
import { cn } from "@/lib/utils";

// COMPONENT
export const CalendarAppointmentTA = ({
  appointment,
  compact = false,
}: {
  appointment: ClientAppointment;
  compact?: boolean;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const status = calendarStatus[appointment.status];
  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/admin/calendar/${appointment.id}${location.search}`)
      }
      className={cn(
        "w-full rounded-lg border border-l-[3px] p-2 text-left transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        status.className,
      )}
      title={`${appointment.time} · ${appointment.client?.name || "Cliente"} · ${appointment.service?.name || "Servicio"} · ${status.label}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] font-semibold">
        <span className="tabular-nums">
          {appointment.time.slice(0, 5)}
          {appointment.end_time ? ` – ${appointment.end_time.slice(0, 5)}` : ""}
        </span>
        {!compact && (
          <span>
            {appointment.duration_minutes ||
              appointment.service?.duration_minutes ||
              appointment.service?.duration ||
              "—"}{" "}
            min
          </span>
        )}
      </div>
      <p className="mt-1 truncate text-xs font-semibold">
        {appointment.client?.name || "Cliente"}
      </p>
      <p className="truncate text-[11px] opacity-90">
        {appointment.service?.name || "Servicio"}
      </p>
      {!compact && (
        <p className="mt-1 truncate text-[10px] opacity-80">
          {appointment.barber?.name ||
            appointment.professional?.name ||
            "Sin profesional"}{" "}
          · {status.label}
        </p>
      )}
    </button>
  );
};
