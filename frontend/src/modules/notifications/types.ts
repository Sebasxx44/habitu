import type { AppNotification } from "@/types/notifications";

// TOASTS
export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
}

export interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastType, description?: string) => void;
  removeToast: (id: string) => void;
}

export interface NotificationActionsState {
  pending: string | null;
  error: string | null;
  markRead: (id: AppNotification["id"]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export type NotificationFilter = "all" | "unread";
export type NotificationErrorKey = "loadError" | "readError" | "readAllError" | "openError";

export interface NotificationFeedState {
  view: {
    filter: NotificationFilter;
    visible: AppNotification[];
    unread: number;
  };
  actions: { setFilter: (filter: NotificationFilter) => void };
}

export interface NotificationNavigationState {
  state: { pending: string | null; error: string | null };
  actions: { destination: (notification: AppNotification) => string | null; open: (notification: AppNotification) => Promise<void> };
}

export interface NotificationState {
  inbox: {
    items: AppNotification[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
  };
  actions: NotificationActionsState;
}
