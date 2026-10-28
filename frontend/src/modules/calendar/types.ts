import type { ClientAppointment } from "@/composables/appointments/types";
import type { Professional, Service } from "@/types/models";

// TYPES
export type CalendarMode = "day" | "week" | "month" | "list";
export interface CalendarPreferences {
  mode: CalendarMode;
  startHour: number;
  endHour: number;
  weekends: boolean;
}
export interface CalendarBoardProps {
  appointments: ClientAppointment[];
  barbers: Professional[];
  services: Service[];
  onDateChange?: (date: Date) => void;
  onStatusChange?: (id: number, status: string) => Promise<void>;
}
export interface CalendarState {
  navigation: {
    date: Date;
    dateKey: string;
    mode: CalendarMode;
    days: Date[];
    title: string;
    today: string;
    setDate: (value: string) => void;
    setMode: (value: CalendarMode) => void;
    openDay: (date: Date) => void;
    move: (direction: number) => void;
  };
  filters: {
    search: string;
    professional: string;
    service: string;
    status: string;
    active: boolean;
    set: (
      name: "search" | "professional" | "service" | "status",
      value: string,
    ) => void;
    reset: () => void;
  };
  agenda: {
    appointments: ClientAppointment[];
    staff: Pick<Professional, "id" | "name">[];
    hours: number[];
    pending: number;
    confirmed: number;
    revenue: number;
    currency: string;
    at: (
      day: Date,
      hour?: number,
      professionalId?: number,
    ) => ClientAppointment[];
  };
  preferences: CalendarPreferences;
}

export interface CalendarBookingForm {
  clientId: string;
  serviceId: string;
  professionalId: string;
  branchId: string;
  resourceId: string;
  date: string;
  slotKey: string;
  duration: string;
  participants: string;
  notes: string;
}
export interface CalendarBookingState {
  form: {
    values: CalendarBookingForm;
    set: (field: keyof CalendarBookingForm, value: string) => void;
  };
  options: {
    clients: import("@/types/models").Client[];
    services: Service[];
    professionals: Professional[];
    branches: import("@/types/models").Branch[];
    resources: import("@/types/models").Resource[];
    loading: boolean;
    error: string;
    retry: () => void;
  };
  schedule: {
    slots: import("@/composables/booking/types").BookingSlot[];
    selected: import("@/composables/booking/types").BookingSlot | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
    service: Service | undefined;
  };
  submission: { saving: boolean; error: string; submit: () => Promise<void> };
}
