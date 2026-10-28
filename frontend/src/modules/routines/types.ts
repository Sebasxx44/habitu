import type { FormEvent } from "react";
import type { ClientAppointment } from "@/composables/appointments/types";

// TYPES
export interface RoutineOccurrence {
  id: number;
  date: string;
  start_time: string;
  status: "PLANNED" | "SKIPPED" | "BOOKED";
  appointment_id: number | null;
}
export interface BookingRoutine {
  id: number;
  name: string;
  status: "ACTIVE" | "PAUSED";
  interval_weeks: number;
  source_appointment_id: number | null;
  occurrences: RoutineOccurrence[];
}
export interface RoutinePreview {
  routine_id: number;
  checked_at: string;
  expires_at: string;
  timezone: string;
  occurrences: (RoutineOccurrence & {
    available: boolean;
    booking_url: string | null;
    quote: {
      total: number;
      currency: string;
      duration_minutes: number;
      remaining_capacity: number;
      participants: number;
    } | null;
  })[];
}
export interface RoutineDraft {
  name: string;
  appointment_id: number;
  interval_weeks: number;
  count: number;
  start_date: string;
  start_time: string;
}
export interface RoutinesResult {
  data: {
    routines: BookingRoutine[];
    appointments: ClientAppointment[];
    previews: Record<number, RoutinePreview>;
  };
  request: {
    loading: boolean;
    busy: boolean;
    error: string;
    reload: () => void;
  };
  actions: {
    pause: (routine: BookingRoutine) => Promise<void>;
    preview: (id: number) => Promise<void>;
    skip: (id: number) => Promise<void>;
    attach: (id: number, appointmentId: number) => Promise<void>;
  };
}
export interface RoutineEditorResult {
  form: {
    value: RoutineDraft;
    setField: <K extends keyof RoutineDraft>(
      key: K,
      value: RoutineDraft[K],
    ) => void;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  feedback: { busy: boolean; error: string; saved: boolean };
}
