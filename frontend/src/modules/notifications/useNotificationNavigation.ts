import { useTranslation } from "react-i18next";
import type { NotificationErrorKey } from "@/modules/notifications/types";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useNotifications } from "@/contexts/AuthContext";
import { httpService, notificationService } from "@/services/auth/authService";
import { notificationDestination } from "@/modules/notifications/destination";
import type { NotificationNavigationState } from "@/modules/notifications/types";
import type { AppNotification } from "@/types/notifications";

// COMPOSABLE
export const useNotificationNavigation = (): NotificationNavigationState => {
  // COMPOSABLES
  const { t } = useTranslation("notificationsUi");

  // STATE
  const { user } = useAuth();
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [errorKey, setError] = useState<NotificationErrorKey | null>(null);

  // ACTIONS
  const destination = (notification: AppNotification) =>
    notificationDestination(notification.data?.url, user?.role);
  const open = async (notification: AppNotification) => {
    const path = destination(notification);
    if (!path || inFlight.current) return;
    inFlight.current = true;
    setPending(String(notification.id));
    setError(null);
    try {
      if (!notification.read) {
        await notificationService.markRead(notification.id);
        await refreshNotifications();
      }
      const retentionAction = notification.data?.retention_action_id;
      if (retentionAction) {
        try { await httpService.post(`/v2/retention-actions/${retentionAction}/click`); }
        catch { /* Attribution must never prevent opening an authorized notification. */ }
      }
      navigate(path);
    } catch {
      setError("openError");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  return { state: { pending, error: errorKey ? t(errorKey) : null }, actions: { destination, open } };
};
