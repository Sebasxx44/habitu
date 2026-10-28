import type { ClientAppointmentRecord } from "@/modules/clients/types";

// FORMATTERS
export const clientInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
export const clientDate = (value?: string | null): string => {
  if (!value) return "Sin registro";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? "Sin registro"
    : new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
};
export const clientMoney = (value: number): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
export const clientToday = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );
export const clientAppointmentDate = (
  appointment: ClientAppointmentRecord,
): string => appointment.date.slice(0, 10);
export const clientAppointmentTime = (
  appointment: ClientAppointmentRecord,
): string => appointment.start_time?.match(/\d{2}:\d{2}/)?.[0] || "—";
export const appointmentIsUpcoming = (
  appointment: ClientAppointmentRecord,
): boolean => {
  if (!["PENDING", "CONFIRMED", "RESCHEDULED"].includes(appointment.status))
    return false;
  return (
    new Date(
      `${clientAppointmentDate(appointment)}T${clientAppointmentTime(appointment)}:00-05:00`,
    ).getTime() >= Date.now()
  );
};
export const appointmentStatus: Record<
  ClientAppointmentRecord["status"],
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  CONFIRMED: { label: "Confirmada", className: "bg-primary/10 text-primary" },
  COMPLETED: {
    label: "Completada",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  NO_SHOW: {
    label: "No asistió",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  RESCHEDULED: {
    label: "Reprogramada",
    className: "bg-primary/10 text-primary",
  },
};
