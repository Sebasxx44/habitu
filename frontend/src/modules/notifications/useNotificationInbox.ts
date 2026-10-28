import { useTranslation } from "react-i18next";
import type { NotificationErrorKey } from "@/modules/notifications/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "@/contexts/AuthContext";
import { useNotificationActions } from "@/modules/notifications/useNotificationActions";
import type { NotificationState } from "@/modules/notifications/types";

export const useNotificationInbox = (): NotificationState => {
  // Composables
  const { t } = useTranslation("notificationsUi");

  // State
  const { notifications, refreshNotifications } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [errorKey, setError] = useState<NotificationErrorKey | null>(null);
  const request = useRef(0);
  const actions = useNotificationActions();

  // Actions
  const refresh = useCallback(() => {
    const version = ++request.current;
    setLoading(true);
    setError(null);
    void refreshNotifications()
      .catch(() => {
        if (version === request.current) setError("loadError");
      })
      .finally(() => {
        if (version === request.current) setLoading(false);
      });
  }, [refreshNotifications]);

  // Lifecycle
  useEffect(() => {
    refresh();
    return () => { request.current += 1; };
  }, [refresh]);

  return {
    inbox: { items: notifications, loading, error: errorKey ? t(errorKey) : null, refresh },
    actions,
  };
};
