// TYPES
export type ReservationKind = "appointment" | "on-demand";
export interface ReservationReference {
  kind: ReservationKind;
  id: number;
}
export type IncidentCategory =
  | "PROFESSIONAL_ABSENT"
  | "RESOURCE_UNAVAILABLE"
  | "PRICE_DIFFERENCE"
  | "DUPLICATE_CHARGE"
  | "SERVICE_NOT_PERFORMED";
export interface ReservationIncident {
  id: number;
  case_number: string;
  category: IncidentCategory;
  description: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED";
  assigned_to: number | null;
  response_due_at: string | null;
  resolution: string | null;
}
export interface ReservationSupport {
  incidents: ReservationIncident[];
  can_manage: boolean;
  can_issue_pin: boolean;
  can_verify_pin: boolean;
  checked_in_at: string | null;
}
export interface ReservationPin {
  pin: string;
  expires_at: string;
}
export interface ReservationMessage {
  id: number;
  content: string;
  sender: { id: number; name: string };
  created_at: string;
  attachments: number[] | null;
}
export interface ReservationConversation {
  id: number;
  subject: string;
  retention_days: number;
  is_active: boolean;
}
export interface SupportState {
  data: {
    support: ReservationSupport | null;
    loading: boolean;
    error: string | null;
  };
  actions: {
    refresh: () => Promise<void>;
    report: (
      category: IncidentCategory,
      description: string,
    ) => Promise<boolean>;
    resolve: (
      incident: ReservationIncident,
      resolution: string,
      dueAt?: string,
    ) => Promise<boolean>;
  };
}
export interface CheckInState {
  data: {
    issued: ReservationPin | null;
    busy: boolean;
    error: string | null;
    verified: boolean;
  };
  actions: {
    issue: () => Promise<void>;
    verify: (pin: string, reason?: string) => Promise<void>;
  };
}
export interface ConversationState {
  data: {
    conversation: ReservationConversation | null;
    messages: ReservationMessage[];
    loading: boolean;
    busy: boolean;
    error: string | null;
  };
  actions: {
    open: () => Promise<void>;
    refresh: () => Promise<void>;
    send: (content: string, file: File | null) => Promise<boolean>;
    download: (id: number) => Promise<void>;
  };
}
