// TYPES
export type RealtimeValue =
  | string
  | number
  | boolean
  | null
  | RealtimeValue[]
  | { [key: string]: RealtimeValue };
export type RealtimePayload = Record<string, RealtimeValue>;
export type RealtimeStatus =
  "disabled" | "connecting" | "connected" | "reconnecting" | "offline";
export interface RealtimeSnapshot {
  status: RealtimeStatus;
  connected: boolean;
}
export interface RefreshOptions {
  enabled?: boolean;
  fallbackMs?: number;
  minIntervalMs?: number;
}
export interface ResourceChange {
  topics: string[];
  revision?: string;
}
export interface RealtimeSubscription {
  channel: string;
  event: string;
  private: boolean;
  callback: (data: RealtimePayload) => void;
}
