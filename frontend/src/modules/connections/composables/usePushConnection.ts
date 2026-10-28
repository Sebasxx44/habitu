import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  connectionService,
  PUSH_DEVICE_TOKEN_KEY,
  PUSH_DEVICE_USER_KEY,
} from "@/modules/connections/service";
import type {
  PushConnection,
  PushConnectionState,
} from "@/modules/connections/types";

// COMPOSABLE
export const usePushConnection = (): PushConnectionState => {
  // COMPOSABLES
  const { user } = useAuth();
  // STATE
  const [status, setStatus] = useState<PushConnection | null>(null);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >(
    "Notification" in window &&
      "serviceWorker" in navigator &&
      window.isSecureContext
      ? Notification.permission
      : "unsupported",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [transactional, setTransactional] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [registeredHere, setRegisteredHere] = useState(
    localStorage.getItem(PUSH_DEVICE_USER_KEY) === String(user?.id) &&
      Boolean(localStorage.getItem(PUSH_DEVICE_TOKEN_KEY)),
  );
  // ACTIONS
  const enable = async () => {
    if (
      !status?.configured ||
      !status.web_config ||
      !status.vapid_key ||
      permission === "unsupported" ||
      !user
    )
      return;
    setBusy(true);
    setError(false);
    try {
      const allowed = await Notification.requestPermission();
      setPermission(allowed);
      if (allowed !== "granted") return;
      const [
        { initializeApp, getApps },
        { getMessaging, getToken, isSupported },
      ] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      if (!(await isSupported())) {
        setPermission("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error("PWA worker unavailable");
      const app =
        getApps().find((item) => item.name === "habitu-notifications") ??
        initializeApp(status.web_config, "habitu-notifications");
      const token = await getToken(getMessaging(app), {
        vapidKey: status.vapid_key,
        serviceWorkerRegistration: registration,
      });
      await connectionService.registerPush(token, transactional, promotions);
      localStorage.setItem(PUSH_DEVICE_TOKEN_KEY, token);
      localStorage.setItem(PUSH_DEVICE_USER_KEY, String(user.id));
      setRegisteredHere(true);
      setStatus(await connectionService.pushStatus());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    const token = localStorage.getItem(PUSH_DEVICE_TOKEN_KEY);
    if (!token) return;
    setBusy(true);
    setError(false);
    try {
      await connectionService.unregisterPush(token);
      const [{ getApps }, { getMessaging, deleteToken }] = await Promise.all([
        import("firebase/app"),
        import("firebase/messaging"),
      ]);
      const app = getApps().find(
        (item) => item.name === "habitu-notifications",
      );
      if (app) await deleteToken(getMessaging(app));
      localStorage.removeItem(PUSH_DEVICE_TOKEN_KEY);
      localStorage.removeItem(PUSH_DEVICE_USER_KEY);
      setRegisteredHere(false);
      setStatus(await connectionService.pushStatus());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  // LIFECYCLE
  useEffect(() => {
    let active = true;
    void connectionService
      .pushStatus()
      .then((result) => {
        if (active) {
          setStatus(result);
          setTransactional(
            result.transactional_enabled || !result.registered_devices,
          );
          setPromotions(result.promotions_enabled);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  // RETURN
  return {
    data: { status, permission, busy, error, registeredHere },
    preferences: { transactional, promotions, setTransactional, setPromotions },
    actions: { enable, disable },
  };
};
