import type { Branch, Professional, Service } from "@/types/models";
import type { ClientAppointment } from "@/composables/appointments/types";

// TYPES
export type AgendaStatus =
  "CONFIRMADA" | "COMPLETADA" | "CANCELADA" | "NO_ASISTIO";
export interface AgendaState {
  list: {
    data: ClientAppointment[];
    loading: boolean;
    error: string | null;
    total: number;
    lastPage: number;
    refresh: () => void;
  };
  options: {
    professionals: Professional[];
    branches: Branch[];
    services: Service[];
  };
  filters: {
    search: string;
    setSearch: (value: string) => void;
    status: string;
    setStatus: (value: string) => void;
    professional: string;
    setProfessional: (value: string) => void;
    branch: string;
    setBranch: (value: string) => void;
    from: string;
    setFrom: (value: string) => void;
    to: string;
    setTo: (value: string) => void;
    page: number;
    setPage: (value: number) => void;
  };
  actions: {
    changeStatus: (id: number, status: string, reason?: string) => Promise<void>;
    setRange: (date: Date) => void;
    setPreset: (preset: "today" | "tomorrow" | "week") => void;
    resetFilters: () => void;
  };
}
