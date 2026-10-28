export interface AppNotification {
  id: number | string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: { url?: string; appointment_id?: number; retention_action_id?: number } | null;
}

export interface NotificationInbox {
  notifications: AppNotification[];
  unread: number;
}
