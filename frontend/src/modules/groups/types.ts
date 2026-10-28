export interface BookingGroup {
  id: number;
  title: string;
  is_organizer: boolean;
  status: "OPEN" | "CLOSED" | "EXPIRED";
  expires_at: string;
  member_limit: number;
  confirmed_count: number;
  my_response: "CONFIRMED" | "DECLINED";
  members: { name: string; response: "CONFIRMED" | "DECLINED" }[];
  payment_mode: "ORGANIZER_PAYS";
  contributions_enabled: false;
  invite_token?: string;
  appointment: {
    id: number | null;
    service: string;
    branch: string;
    resource: string | null;
    date: string;
    start_time: string;
    status: string;
    currency: string;
    total: string;
    payment_status: string;
  } | null;
  options: { id: number; label: string; votes: number; selected: boolean }[];
}
export interface GroupPayload {
  title: string;
  appointment_id?: number;
  member_limit: number;
  expires_at: string;
  options: string[];
}
export interface GroupCoordinationState {
  directory: {
    items: BookingGroup[];
    loading: boolean;
    busy: boolean;
    error: boolean;
    refresh: () => void;
  };
  invitation: {
    token: string;
    link: string;
    setToken: (token: string) => void;
    join: () => Promise<void>;
    create: (id: number) => Promise<void>;
  };
  editor: {
    title: string;
    setTitle: (value: string) => void;
    appointment: string;
    setAppointment: (value: string) => void;
    options: string;
    setOptions: (value: string) => void;
    limit: string;
    setLimit: (value: string) => void;
    create: () => Promise<void>;
  };
  actions: {
    respond: (
      id: number,
      response: "CONFIRMED" | "DECLINED",
      option?: number,
    ) => Promise<void>;
    close: (id: number) => Promise<void>;
    attach: (id: number, appointment: number) => Promise<void>;
  };
}
