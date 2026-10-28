// TYPES
export interface CalendarConnection {
  configured: boolean;
  connected: boolean;
  professional_id: number;
  last_synced_at: string | null;
  sync_error: string | null;
  channel_expires_at: string | null;
  busy_count: number;
}
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}
export interface PushConnection {
  configured: boolean;
  web_config: FirebaseWebConfig | null;
  vapid_key: string | null;
  registered_devices: number;
  transactional_enabled: boolean;
  promotions_enabled: boolean;
}
export interface CalendarConnectionState {
  data: {
    status: CalendarConnection | null;
    loading: boolean;
    busy: boolean;
    error: boolean;
    professionals: { id: number; name: string }[];
  };
  selection: {
    professionalId: number | null;
    setProfessionalId: (id: number) => void;
  };
  actions: {
    refresh: () => Promise<void>;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    sync: () => Promise<void>;
    exportAppointments: () => Promise<void>;
  };
}
export interface PushConnectionState {
  data: {
    status: PushConnection | null;
    permission: NotificationPermission | "unsupported";
    busy: boolean;
    error: boolean;
    registeredHere: boolean;
  };
  preferences: {
    transactional: boolean;
    promotions: boolean;
    setTransactional: (value: boolean) => void;
    setPromotions: (value: boolean) => void;
  };
  actions: { enable: () => Promise<void>; disable: () => Promise<void> };
}
