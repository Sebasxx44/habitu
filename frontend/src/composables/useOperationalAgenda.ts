import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/App";
import { useSearchParams } from "react-router-dom";
import { useRealtimeRevision } from "@/modules/realtime/useRealtimeRefresh";
import {
  appointmentService,
  businessService,
  professionalService,
  serviceService,
} from "@/services/business/businessService";
import { httpService } from "@/services/auth/authService";
import { calendarDirectory } from "@/modules/calendar/calendarApi";
import { calendarMonthRange, validCalendarDate } from "@/modules/calendar/calendarModel";
import type {
  AppointmentPage,
  ClientAppointment,
} from "@/composables/appointments/types";
import type { AgendaState } from "@/composables/agenda/types";
import type { Branch, Professional, Service } from "@/types/models";

// CONSTANTS
const statusApi: Record<string, string> = {
  CONFIRMADA: "CONFIRMED",
  COMPLETADA: "COMPLETED",
  CANCELADA: "CANCELLED",
  NO_ASISTIO: "NO_SHOW",
};
const localToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date(),
  );

// COMPOSABLE
export const useOperationalAgenda = (calendar = false): AgendaState => {
  // STATE
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const liveRevision = useRealtimeRevision(["appointments"]);
  const optionsRevision = useRealtimeRevision(["branches", "professionals", "services"]);
  const [result, setResult] = useState<AppointmentPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [professional, setProfessional] = useState("");
  const [branch, setBranch] = useState(() => /^\d+$/.test(searchParams.get("branch_id") ?? "") ? searchParams.get("branch_id") ?? "" : "");
  const requestedDate = searchParams.get("date") ?? "";
  const initialDate = new Date(`${validCalendarDate(requestedDate) ? requestedDate : localToday()}T12:00:00`);
  const [from, setFrom] = useState(() => calendar ? calendarMonthRange(initialDate).from : validCalendarDate(requestedDate) ? requestedDate : localToday());
  const [to, setTo] = useState(() => calendar ? calendarMonthRange(initialDate).to : validCalendarDate(requestedDate) ? requestedDate : localToday());
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const resolvedKey = useRef<string | null>(null);

  // EFFECTS
  useEffect(() => {
    let active = true;
    const optionsController = new AbortController();
    const loadOptions = async () => {
      try {
        const [staff, catalog, business] = await Promise.all([
          calendar && user?.barber_shop_id ? calendarDirectory<Professional>("/v2/professionals", user.barber_shop_id, optionsController.signal) : professionalService.getAll(user?.barber_shop_id ?? undefined),
          calendar && user?.barber_shop_id ? calendarDirectory<Service>("/v2/services", user.barber_shop_id, optionsController.signal) : serviceService.getAll(user?.barber_shop_id ?? undefined),
          user?.barber_shop_id ? businessService.getById(user.barber_shop_id) : Promise.resolve(null),
        ]);
        if (active) {
          setProfessionals(staff);
          setServices(catalog);
          setBranches(business?.branches ?? []);
        }
      } catch {
        if (active)
          setError("No se pudieron cargar las opciones de la agenda.");
      }
    };
    if (user?.role === "ADMIN_BARBERIA" || calendar) void loadOptions();
    return () => {
      active = false;
      optionsController.abort();
    };
  }, [user?.barber_shop_id, user?.role, calendar, optionsRevision]);
  useEffect(() => {
    setPage(1);
  }, [search, status, professional, branch, from, to]);
  useEffect(() => {
    const controller = new AbortController();
    const requestKey = JSON.stringify({ page, search, status, professional, branch, from, to, calendar });
    if (resolvedKey.current !== requestKey) setLoading(true);
    setError(null);
    if (from && to && from > to) { setResult(null); setError("La fecha de inicio debe ser anterior o igual a la fecha final."); setLoading(false); return; }
    const fetchPage = (number: number) =>
      appointmentService.getPage(
        {
          page: number,
          per_page: calendar ? 100 : 15,
          search: search || undefined,
          status: status || undefined,
          professional_id: professional ? Number(professional) : undefined,
          branch_id: branch ? Number(branch) : undefined,
          date_from: from || undefined,
          date_to: to || undefined,
        },
        controller.signal,
      );
    const load = async () => {
      try {
        const first = await fetchPage(calendar ? 1 : page);
        const rows: ClientAppointment[] = [...first.data];
        if (calendar)
          for (let next = 2; next <= first.last_page; next++)
            rows.push(...(await fetchPage(next)).data);
        if (!controller.signal.aborted) {
          if (!calendar && page > first.last_page) setPage(first.last_page);
          else { resolvedKey.current = requestKey; setResult({ ...first, data: rows }); }
        }
      } catch {
        if (!controller.signal.aborted)
          setError("No pudimos cargar la agenda. Inténtalo de nuevo.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    const timer = setTimeout(
      () => {
        void load();
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    page,
    search,
    status,
    professional,
    branch,
    from,
    to,
    revision,
    liveRevision,
    optionsRevision,
    calendar,
  ]);

  // ACTIONS
  const refresh = () => setRevision((value) => value + 1);
  const changeStatus = async (id: number, value: string, reason?: string) => {
    if (value === "CANCELADA")
      await httpService.post(`/v2/appointments/${id}/cancel`, {
        reason: reason || "Cancelación desde la agenda del negocio",
      });
    else if (value === "COMPLETADA")
      await httpService.post(`/v2/appointments/${id}/complete`, {});
    else if (statusApi[value])
      await httpService.put(`/v2/appointments/${id}`, {
        status: statusApi[value],
      });
    refresh();
  };
  const setRange = (date: Date) => {
    const range = calendarMonthRange(date);
    setFrom(range.from);
    setTo(range.to);
  };

  const setPreset = (preset: "today" | "tomorrow" | "week") => {
    const start = new Date(`${localToday()}T12:00:00Z`);
    if (preset === "tomorrow") start.setUTCDate(start.getUTCDate() + 1);
    setFrom(start.toISOString().slice(0, 10));
    if (preset === "week") start.setUTCDate(start.getUTCDate() + 6);
    setTo(start.toISOString().slice(0, 10));
    setPage(1);
  };
  const resetFilters = () => { setSearch(""); setStatus(""); setProfessional(""); setBranch(""); setPreset("today"); };

  // RETURN
  return {
    list: {
      data: result?.data ?? [],
      loading,
      error,
      total: result?.total ?? 0,
      lastPage: result?.last_page ?? 1,
      refresh,
    },
    options: { professionals, branches, services },
    filters: {
      search,
      setSearch,
      status,
      setStatus,
      professional,
      setProfessional,
      branch,
      setBranch,
      from,
      setFrom,
      to,
      setTo,
      page,
      setPage,
    },
    actions: { changeStatus, setRange, setPreset, resetFilters },
  };
};
