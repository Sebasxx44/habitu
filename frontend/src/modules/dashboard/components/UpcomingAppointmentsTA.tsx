import { t } from 'i18next'
import { formatTime } from '@/i18n/formatters'
import { ArrowUpRight, Clock3, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { PanelTA } from "@/components/TA/PanelTA";
import { StateTA } from "@/components/TA/StateTA";
import { formatDay, statusLabel } from "@/modules/dashboard/formatters";
import type {
  DashboardAppointment,
  DashboardOverview,
} from "@/modules/dashboard/types";

// COMPONENTS
const AppointmentContentTA = ({
  appointment,
  clientView,
}: {
  appointment: DashboardAppointment;
  clientView: boolean;
}) => (
  <>
    <div className="w-16 shrink-0 rounded-xl bg-primary/5 px-1 py-3 text-center text-primary">
      <p className="text-sm font-semibold tabular-nums">
        {formatTime(appointment.startTime)}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {formatDay(appointment.date)}
      </p>
    </div>
    <div className="h-9 w-px shrink-0 bg-border" />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">{appointment.service}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {clientView ? appointment.business : appointment.client}
        {appointment.professional && ` · ${appointment.professional}`}
      </p>
    </div>
    <span className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-2.5 py-1 text-[10px] font-medium sm:inline-flex">
      <Clock3 className="size-3" />
      {statusLabel(appointment.status)}
    </span>
  </>
);

export const UpcomingAppointmentsTA = ({
  data,
  agendaPath,
  canOpenAgenda = true,
}: {
  data: DashboardOverview;
  agendaPath: string;
  canOpenAgenda?: boolean;
}) => (
  <PanelTA
    icon={CalendarDays}
    title={
      data.role === "CLIENTE"
        ? t('dashboard.upcoming')
        : t('dashboard.upcomingAgenda')
    }
    description={t('dashboard.upcomingZone',{zone:data.timezone})}
    action={
      canOpenAgenda && (
        <Link
          to={agendaPath}
          className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-primary"
        >
          {data.role === "SUPERADMIN" ? t('dashboard.viewBusinesses') : t('dashboard.viewAgenda')}
          <ArrowUpRight className="size-3.5" />
        </Link>
      )
    }
  >
    {data.upcoming.length ? (
      <div className="divide-y divide-border">
        {data.upcoming.map((appointment) =>
          canOpenAgenda ? (
            <Link
              key={appointment.id}
              to={agendaPath}
              className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-secondary/50 md:gap-4 md:px-6"
              aria-label={`${appointment.service}, ${formatDay(appointment.date)}, ${formatTime(appointment.startTime)}. Abrir agenda`}
            >
              <AppointmentContentTA
                appointment={appointment}
                clientView={data.role === "CLIENTE"}
              />
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          ) : (
            <div
              key={appointment.id}
              className="flex items-center gap-3 px-5 py-4 md:gap-4 md:px-6"
            >
              <AppointmentContentTA
                appointment={appointment}
                clientView={data.role === "CLIENTE"}
              />
            </div>
          ),
        )}
      </div>
    ) : (
      <StateTA
        title={t('dashboard.agendaSpace')}
        description={
          data.role === "CLIENTE"
            ? t('dashboard.findService')
            : t('dashboard.newBookings')
        }
      />
    )}
  </PanelTA>
);
