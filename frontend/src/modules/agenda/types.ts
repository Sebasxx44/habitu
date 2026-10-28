import type { AnalyticsOverview } from "@/modules/analytics/types";

// TYPES
export interface RequestedAppointmentState {
  error: boolean;
}

export interface GrowthAction {
  id: string;
  priority: "attention" | "opportunity";
  title: string;
  evidence: string;
  action: string;
  to: string;
  label: string;
}
export interface AgendaGrowthState {
  actions: GrowthAction[];
  data: AnalyticsOverview;
}
export interface AppointmentNotesState {
  value: string;
  setValue: (value: string) => void;
  saving: boolean;
  error: string | null;
  saved: boolean;
  dirty: boolean;
  save: () => Promise<void>;
}
