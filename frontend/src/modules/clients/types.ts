import type { FormEvent } from "react";

// API CONTRACTS
export interface ClientRecord {
  id: number;
  business_id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  photo_url?: string | null;
  is_vip?: boolean;
  loyalty_points?: number;
  created_at: string;
}

export interface ClientAppointmentRecord {
  id: number;
  date: string;
  start_time: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
    | "RESCHEDULED";
  price: number | string;
  final_price?: number | string | null;
  service?: { id: number; name: string } | null;
  professional?: { id: number; name: string } | null;
  branch?: { id: number; name: string } | null;
}

export interface ClientApiResponse<T> {
  data: T;
}
export interface ClientsPage {
  data: ClientRecord[];
  last_page: number;
}
export interface ClientDraft {
  name: string;
  email: string;
  phone: string;
  notes: string;
}
export type ClientSegment = "all" | "new" | "incomplete" | "vip";
export type ClientSort = "recent" | "name" | "oldest";

// DIRECTORY STATE
export interface ClientsState {
  directory: {
    clients: ClientRecord[];
    filtered: ClientRecord[];
    visible: ClientRecord[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  filters: {
    search: string;
    segment: ClientSegment;
    sort: ClientSort;
    page: number;
    pages: number;
    setSearch: (value: string) => void;
    setSegment: (value: ClientSegment) => void;
    setSort: (value: ClientSort) => void;
    setPage: (value: number) => void;
    clear: () => void;
  };
  metrics: {
    total: number;
    newThisMonth: number;
    complete: number;
    vip: number;
  };
  actions: { exportCsv: () => void };
}

// PROFILE STATE
export interface ClientProfileState {
  record: {
    client: ClientRecord | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
  };
  history: {
    appointments: ClientAppointmentRecord[];
    visible: ClientAppointmentRecord[];
    filter: "all" | "upcoming" | "completed" | "cancelled";
    setFilter: (value: "all" | "upcoming" | "completed" | "cancelled") => void;
    loading: boolean;
    error: string | null;
    loadMore: () => void;
    hasMore: boolean;
  };
  metrics: {
    completed: number;
    spent: number;
    upcoming: number;
    lastVisit: string | null;
  };
}

// EDITOR STATE
export interface ClientEditorState {
  form: {
    values: ClientDraft;
    change: (field: keyof ClientDraft, value: string) => void;
    error: string | null;
    saving: boolean;
    submit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
}

export interface ClientRemovalState {
  removal: {
    saving: boolean;
    error: string | null;
    submit: () => Promise<void>;
  };
}
