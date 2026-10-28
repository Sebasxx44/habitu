// API TYPES
export interface AvailabilityAlert {
  id: number;
  status: "PENDING" | "NOTIFIED";
  preferred_date: string | null;
  preferred_date_to: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  duration_minutes: number | null;
  participants: number;
  expires_at: string | null;
  notified_at: string | null;
  business: { id: number; name: string; slug: string } | null;
  service: { id: number; name: string; duration_minutes: number } | null;
  branch?: { id: number; name: string } | null;
  resource?: { id: number; name: string } | null;
  professional: { id: number; name: string } | null;
}

export interface AvailabilityAlertsResponse {
  success: boolean;
  data: AvailabilityAlert[];
  message?: string;
}

// COMPOSABLE CONTRACT
export interface AvailabilityAlertsState {
  listing: {
    items: AvailabilityAlert[];
    loading: boolean;
    error: boolean;
    refresh: () => void;
  };
  cancellation: {
    pendingId: number | null;
    failed: boolean;
    completed: boolean;
    cancel: (id: number) => Promise<void>;
  };
}
