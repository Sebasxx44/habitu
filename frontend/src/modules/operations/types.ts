import type { Dispatch, SetStateAction } from "react";

// TYPES
export interface OperationOption {
  id: number;
  name: string;
}
export interface OperationSchedule {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  branch_id?: number;
}
export interface OperationProfessional extends OperationOption {
  business_id: number;
  availability: OperationSchedule[];
}
export interface OperationResource extends OperationOption {
  branch_id: number;
  type: string;
  capacity: number;
  is_active: boolean;
}
export interface OperationBlock {
  id: number;
  professional_id: number | null;
  resource_id: number | null;
  branch_id: number | null;
  kind: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}
export interface OperationAppointment {
  id: number;
  branch_id: number;
  professional_id: number | null;
  resource_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  checked_in_at: string | null;
  participants: number;
  client_name: string;
  service_name: string;
  professional_name: string | null;
  resource_name: string | null;
}
export interface OperationsContext {
  business: OperationOption;
  businesses: OperationOption[];
  timezone: string;
  professionals: OperationProfessional[];
  branches: OperationOption[];
  services: OperationOption[];
  resources: OperationResource[];
  blocks: OperationBlock[];
  can_manage_resources: boolean;
  service_links: {
    professional_id: number;
    branch_id: number;
    service_id: number;
    is_active: boolean;
  }[];
  resource_links: { resource_id: number; service_id: number }[];
  today: {
    date: string;
    time: string;
    appointments: OperationAppointment[];
    unassigned: number;
  };
}
export interface OperationsContextResult {
  data: OperationsContext | null;
  request: { loading: boolean; error: string; reload: () => void };
  selection: {
    businessId: string;
    setBusinessId: Dispatch<SetStateAction<string>>;
  };
}
export interface OperationFeedback {
  busy: boolean;
  error: string;
  saved: boolean;
}
export interface ProfessionalOperationsResult {
  selection: {
    professionalId: number;
    branchId: number;
    setProfessionalId: (id: number) => void;
    setBranchId: (id: number) => void;
  };
  schedule: {
    slots: OperationSchedule[];
    update: <K extends keyof OperationSchedule>(
      day: number,
      key: K,
      value: OperationSchedule[K],
    ) => void;
    save: () => Promise<void>;
  };
  services: {
    selected: number[];
    toggle: (id: number) => void;
    save: () => Promise<void>;
  };
  feedback: OperationFeedback;
}
export interface BlockDraft {
  target: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}
export interface BlockOperationsResult {
  form: {
    value: BlockDraft;
    setField: (key: keyof BlockDraft, value: string) => void;
    save: () => Promise<void>;
  };
  feedback: OperationFeedback;
  remove: (id: number) => Promise<void>;
}
export interface ResourceDraft {
  name: string;
  branch_id: number;
  type: string;
  capacity: number;
  is_active: boolean;
}
export interface ResourceOperationsResult {
  form: {
    id: number;
    select: (id: number) => void;
    value: ResourceDraft;
    setField: <K extends keyof ResourceDraft>(
      key: K,
      value: ResourceDraft[K],
    ) => void;
    save: () => Promise<void>;
  };
  services: {
    selected: number[];
    toggle: (id: number) => void;
    save: () => Promise<void>;
  };
  feedback: OperationFeedback;
}

// TYPES
export interface TodayOperationsResult {
  attention: {
    next: OperationAppointment[];
    arrivals: OperationAppointment[];
    delayed: OperationAppointment[];
    unpaid: OperationAppointment[];
    recoverable: OperationAppointment[];
  };
  resources: {
    id: number;
    name: string;
    minutes: number;
    reservations: number;
    active: boolean;
  }[];
  actions: {
    agenda: (branchId?: number, appointmentId?: number) => string;
    onDemand: string;
  };
}
