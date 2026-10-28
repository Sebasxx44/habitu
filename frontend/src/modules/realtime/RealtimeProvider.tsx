import { useEffect } from "react";
import { useAuth, useNotifications } from "@/contexts/AuthContext";
import { httpService } from "@/services/auth/authService";
import {
  connectRealtime,
  disconnectRealtime,
  subscribeRealtime,
} from "@/modules/realtime/connection";
import { publishResourceChange } from "@/modules/realtime/resourceBus";
import { useRealtimeRefresh } from "@/modules/realtime/useRealtimeRefresh";
import type { RealtimePayload } from "@/modules/realtime/types";

// COMPONENT
export const RealtimeProvider = () => {
  const { user, refreshUser } = useAuth();
  const { refreshNotifications } = useNotifications();
  useRealtimeRefresh(["notifications"], refreshNotifications, {
    enabled: !!user,
  });
  useRealtimeRefresh(["account", "users"], refreshUser, {
    enabled: !!user,
    fallbackMs: 300000,
  });
  useEffect(() => {
    if (!user) {
      disconnectRealtime();
      return;
    }
    const receive = (payload: RealtimePayload): void => {
      if (!Array.isArray(payload.topics)) return;
      const topics = payload.topics.filter(
        (value): value is string => typeof value === "string",
      );
      publishResourceChange({
        topics,
        revision:
          typeof payload.revision === "string" ? payload.revision : undefined,
      });
    };
    const off = [
      subscribeRealtime(`user.${user.id}`, ".resource.changed", receive),
      subscribeRealtime("accounts", ".resource.changed", receive),
    ];
    off.push(
      subscribeRealtime("marketplace", ".resource.changed", receive, false),
    );
    if (user.role === "SUPERADMIN")
      off.push(subscribeRealtime("platform", ".resource.changed", receive));
    if (
      user.barber_shop_id &&
      ["ADMIN_BARBERIA", "PROFESSIONAL"].includes(user.role)
    )
      off.push(
        subscribeRealtime(
          `business.${user.barber_shop_id}`,
          ".resource.changed",
          receive,
        ),
      );
    const reconnect = (): void => connectRealtime(httpService.getToken());
    reconnect();
    window.addEventListener("habitu:session-changed", reconnect);
    return () => {
      off.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener("habitu:session-changed", reconnect);
      disconnectRealtime();
    };
  }, [user?.id, user?.role, user?.barber_shop_id]);
  return null;
};
