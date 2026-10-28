import { useTranslation } from "react-i18next";
import type { NotificationErrorKey } from "@/modules/notifications/types";
import { useRef, useState } from "react";
import { useNotifications } from "@/contexts/AuthContext";
import { notificationService } from "@/services/auth/authService";
import type { NotificationActionsState } from "@/modules/notifications/types";
import type { AppNotification } from "@/types/notifications";

// COMPOSABLE
export const useNotificationActions = (): NotificationActionsState => {
  // COMPOSABLES
  const { t } = useTranslation("notificationsUi");

  // STATE
  const { refreshNotifications } = useNotifications();
  const [pending, setPending] = useState<string | null>(null);
  const [errorKey, setError] = useState<NotificationErrorKey | null>(null);
  const inFlight = useRef(false);

  // ACTIONS
  const markRead = async (id: AppNotification["id"]) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(String(id));
    setError(null);
    try {
      await notificationService.markRead(id);
      await refreshNotifications();
    } catch {
      setError("readError");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const markAllRead = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending("all");
    setError(null);
    try {
      await notificationService.markAllRead();
      await refreshNotifications();
    } catch {
      setError("readAllError");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  return {
    pending,
    error: errorKey ? t(errorKey) : null,
    markRead,
    markAllRead,
  };
};
