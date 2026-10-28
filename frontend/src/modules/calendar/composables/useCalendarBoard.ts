import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/App";
import {
  calendarDate,
  calendarDays,
  calendarToday,
  readCalendarPreferences,
  validCalendarDate,
} from "@/modules/calendar/calendarModel";
import type {
  CalendarBoardProps,
  CalendarMode,
  CalendarState,
} from "@/modules/calendar/types";

// COMPOSABLE
export const useCalendarBoard = ({
  appointments,
  barbers,
  onDateChange,
}: CalendarBoardProps): CalendarState => {
  // STATE
  const { user } = useAuth();
  const preferences = useMemo(
    () => readCalendarPreferences(user?.id),
    [user?.id],
  );
  const [params, setParams] = useSearchParams();
  const today = calendarToday();
  const dateKey = validCalendarDate(params.get("date") || "")
    ? params.get("date")!
    : today;
  const modeParam = params.get("view");
  const mode: CalendarMode =
    modeParam === "day" ||
    modeParam === "week" ||
    modeParam === "month" ||
    modeParam === "list"
      ? modeParam
      : preferences.mode;
  const date = useMemo(() => new Date(`${dateKey}T12:00:00`), [dateKey]);
  const days = calendarDays(date, mode);
  const search = params.get("search") || "";
  const professional = params.get("professional_id") || "";
  const service = params.get("service_id") || "";
  const status = params.get("status") || "";

  // EFFECTS
  useEffect(() => {
    onDateChange?.(date);
  }, [dateKey]);

  // COMPUTED
  const filtered = appointments
    .filter((appointment) => {
      const text = [
        appointment.client?.name,
        appointment.client?.phone,
        appointment.barber?.name,
        appointment.professional?.name,
        appointment.service?.name,
        appointment.booking_code,
      ]
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        (!search || text.includes(search.toLocaleLowerCase("es"))) &&
        (!professional ||
          String(appointment.professional_id ?? appointment.barber_id) ===
            professional) &&
        (!service || String(appointment.service_id) === service) &&
        (!status || appointment.status === status)
      );
    })
    .sort((first, second) =>
      `${first.date}${first.time}`.localeCompare(
        `${second.date}${second.time}`,
      ),
    );
  const dayKeys = new Set(days.map(calendarDate));
  const visible = filtered.filter((appointment) =>
    dayKeys.has(appointment.date.slice(0, 10)),
  );
  const professionalColumns = new Map(
    barbers
      .filter((person) => !professional || String(person.id) === professional)
      .map((person) => [person.id, { id: person.id, name: person.name }]),
  );
  visible.forEach((appointment) => {
    const id = appointment.professional_id ?? appointment.barber_id;
    if (id && !professionalColumns.has(id))
      professionalColumns.set(id, {
        id,
        name:
          appointment.professional?.name ||
          appointment.barber?.name ||
          `Profesional archivado #${id}`,
      });
  });
  if (
    !professionalColumns.size ||
    visible.some(
      (appointment) => !(appointment.professional_id ?? appointment.barber_id),
    )
  )
    professionalColumns.set(0, { id: 0, name: "Sin profesional" });
  const staff = [...professionalColumns.values()];
  const hoursUsed = visible
    .map((appointment) => Number(appointment.time.slice(0, 2)))
    .filter(Number.isFinite);
  const firstHour = Math.min(preferences.startHour, ...hoursUsed);
  const lastHour = Math.min(
    24,
    Math.max(preferences.endHour, ...hoursUsed.map((hour) => hour + 1)),
  );
  const active = visible.filter(
    (appointment) => !["CANCELADA", "NO_ASISTIO"].includes(appointment.status),
  );
  const displayDays =
    preferences.weekends || mode === "day" || mode === "month"
      ? days
      : days.filter(
          (day) =>
            ![0, 6].includes(day.getDay()) ||
            visible.some(
              (appointment) =>
                appointment.date.slice(0, 10) === calendarDate(day),
            ),
        );
  const title =
    mode === "day"
      ? date.toLocaleDateString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : mode === "month"
        ? date.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
        : `${days[0].toLocaleDateString("es-CO", { day: "numeric", month: "short" })} — ${days[6].toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`;

  // ACTIONS
  const update = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const openDay = (nextDate: Date) => {
    const nextDateKey = calendarDate(nextDate);
    if (!validCalendarDate(nextDateKey)) return;
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set("date", nextDateKey);
        next.set("view", "day");
        return next;
      },
      { replace: true },
    );
  };
  const move = (direction: number) => {
    const next =
      direction === 0 ? new Date(`${today}T12:00:00`) : new Date(date);
    if (direction && mode === "month") {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    } else if (direction)
      next.setDate(next.getDate() + direction * (mode === "day" ? 1 : 7));
    update("date", calendarDate(next));
  };

  // RETURN
  return {
    navigation: {
      date,
      dateKey,
      mode,
      days: displayDays,
      title,
      today,
      setDate: (value) => {
        if (validCalendarDate(value)) update("date", value);
      },
      setMode: (value) => update("view", value),
      openDay,
      move,
    },
    filters: {
      search,
      professional,
      service,
      status,
      active: !!(search || professional || service || status),
      set: (name, value) =>
        update(
          name === "professional"
            ? "professional_id"
            : name === "service"
              ? "service_id"
              : name,
          value,
        ),
      reset: () =>
        setParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            ["search", "professional_id", "service_id", "status"].forEach(
              (key) => next.delete(key),
            );
            return next;
          },
          { replace: true },
        ),
    },
    agenda: {
      appointments: visible,
      staff,
      hours: Array.from(
        { length: lastHour - firstHour },
        (_, index) => firstHour + index,
      ),
      pending: visible.filter(
        (appointment) => appointment.status === "PENDIENTE",
      ).length,
      confirmed: visible.filter(
        (appointment) => appointment.status === "CONFIRMADA",
      ).length,
      revenue: active.reduce(
        (sum, appointment) => sum + Number(appointment.price),
        0,
      ),
      currency: active[0]?.currency || "COP",
      at: (day, hour, professionalId) =>
        visible.filter(
          (appointment) =>
            appointment.date.slice(0, 10) === calendarDate(day) &&
            (hour === undefined ||
              Number(appointment.time.slice(0, 2)) === hour) &&
            (professionalId === undefined ||
              (appointment.professional_id ?? appointment.barber_id ?? 0) ===
                professionalId),
        ),
    },
    preferences,
  };
};
