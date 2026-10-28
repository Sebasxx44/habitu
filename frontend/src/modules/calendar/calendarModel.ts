import type { ClientAppointment } from "@/composables/appointments/types";
import type {
  CalendarMode,
  CalendarPreferences,
} from "@/modules/calendar/types";

// CONSTANTS
export const defaultCalendarPreferences: CalendarPreferences = {
  mode: "week",
  startHour: 8,
  endHour: 20,
  weekends: true,
};
export const calendarStatus: Record<
  ClientAppointment["status"],
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: "Por confirmar",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  CONFIRMADA: {
    label: "Confirmada",
    className: "border-primary/25 bg-primary/10 text-primary",
  },
  COMPLETADA: {
    label: "Completada",
    className:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  CANCELADA: {
    label: "Cancelada",
    className: "border-border bg-muted text-muted-foreground",
  },
  NO_ASISTIO: {
    label: "No asistió",
    className:
      "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200",
  },
};

// HELPERS
export const calendarDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const calendarToday = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );
export const validCalendarDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) &&
  calendarDate(new Date(`${value}T12:00:00`)) === value;
export const calendarDays = (date: Date, mode: CalendarMode): Date[] => {
  if (mode === "day") return [date];
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    mode === "month" ? 1 : date.getDate(),
  );
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from(
    { length: mode === "month" ? 42 : 7 },
    (_, index) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );
};
export const calendarMonthRange = (
  date: Date,
): { from: string; to: string } => {
  const days = calendarDays(date, "month");
  return {
    from: calendarDate(days[0]),
    to: calendarDate(days[days.length - 1]),
  };
};
export const calendarAmount = (value: number, currency = "COP"): string =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
export const calendarPreferenceKey = (userId?: number): string =>
  `habitu:calendar:${userId ?? "local"}`;
export const readCalendarPreferences = (
  userId?: number,
): CalendarPreferences => {
  try {
    const value: Partial<CalendarPreferences> | null = JSON.parse(
      localStorage.getItem(calendarPreferenceKey(userId)) || "null",
    );
    if (
      !value ||
      !["day", "week", "month", "list"].includes(value.mode || "") ||
      !Number.isInteger(value.startHour) ||
      !Number.isInteger(value.endHour) ||
      Number(value.startHour) < 0 ||
      Number(value.endHour) > 24 ||
      Number(value.startHour) >= Number(value.endHour)
    )
      return defaultCalendarPreferences;
    return {
      mode: value.mode ?? "week",
      startHour: Number(value.startHour),
      endHour: Number(value.endHour),
      weekends: value.weekends !== false,
    };
  } catch {
    return defaultCalendarPreferences;
  }
};
