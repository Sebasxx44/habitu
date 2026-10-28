import type { Business } from "@/types/models";

// TYPES
export interface QueueEntry {
  id: number;
  ticket_number: number;
  status: "WAITING" | "CALLED" | "SERVING" | "COMPLETED" | "CANCELLED";
  estimated_wait_minutes: number | null;
  queue_id?: number;
}
export interface SmartQueue {
  id: number;
  name: string;
  business_id: number;
  branch_id?: number | null;
  status: string;
  current_number: number;
  estimated_wait_minutes: number | null;
  entries_count?: number;
  entries?: QueueEntry[];
}
export interface QueueResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
export interface QueueState {
  selection: {
    businesses: Business[];
    businessId: string;
    selectBusiness: (id: string) => void;
    search: string;
    setSearch: (value: string) => void;
    queue: SmartQueue | null;
    view: (id: number) => Promise<void>;
    back: () => void;
  };
  list: {
    queues: SmartQueue[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
  ticket: {
    entry: QueueEntry | null;
    pending: boolean;
    canJoin: boolean;
    canManage: boolean;
    join: () => Promise<void>;
    cancel: () => Promise<void>;
    callNext: () => Promise<void>;
    serve: (id: number) => Promise<void>;
    complete: (id: number) => Promise<void>;
  };
}
