import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { subscriptionsAreReady } from "@/modules/realtime/subscriptionHealth";
import {
  clearResourceHistory,
  publishResourceChange,
} from "@/modules/realtime/resourceBus";
import type {
  RealtimePayload,
  RealtimeSnapshot,
  RealtimeStatus,
  RealtimeSubscription,
} from "@/modules/realtime/types";

// STATE
let echo: Echo<"pusher"> | null = null;
let sessionToken: string | null = null;
let snapshot: RealtimeSnapshot = { status: "disabled", connected: false };
const listeners = new Set<() => void>();
const subscriptions = new Set<RealtimeSubscription>();
const channels = new Map<string, number>();
const subscribedChannels = new Set<string>();
let transportConnected = false;
let needsResync = true;

// ACTIONS
const setStatus = (status: RealtimeStatus): void => {
  if (snapshot.status === status) return;
  snapshot = { status, connected: status === "connected" };
  listeners.forEach((listener) => listener());
};
const updateReadiness = (): void => {
  if (!echo) return;
  if (!navigator.onLine) {
    setStatus("offline");
    return;
  }
  if (
    subscriptionsAreReady(
      transportConnected,
      channels.keys(),
      subscribedChannels,
    )
  ) {
    setStatus("connected");
    if (needsResync) {
      needsResync = false;
      publishResourceChange({ topics: ["*"] });
    }
  } else
    setStatus(snapshot.status === "connecting" ? "connecting" : "reconnecting");
};
export const getRealtimeSnapshot = (): RealtimeSnapshot => snapshot;
export const getEcho = (): Echo<"pusher"> | null => echo;
export const observeConnection = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const channelKey = (subscription: RealtimeSubscription): string =>
  `${subscription.private ? "private-" : ""}${subscription.channel}`;
const attach = (subscription: RealtimeSubscription): void => {
  if (!echo) return;
  const client = echo;
  const key = channelKey(subscription);
  const first = !channels.has(key);
  channels.set(key, (channels.get(key) || 0) + 1);
  const channel = subscription.private
    ? echo.private(subscription.channel)
    : echo.channel(subscription.channel);
  if (first) {
    channel.error(() => {
      if (echo !== client) return;
      subscribedChannels.delete(key);
      setStatus("reconnecting");
    });
    channel.subscribed(() => {
      if (echo !== client || !channels.has(key)) return;
      subscribedChannels.add(key);
      updateReadiness();
    });
  }
  updateReadiness();
  channel.listen(subscription.event, subscription.callback);
};
export const subscribeRealtime = (
  channel: string,
  event: string,
  callback: (data: RealtimePayload) => void,
  isPrivate = true,
): (() => void) => {
  const subscription = {
    channel: channel.replace(/^private-/, ""),
    event,
    callback,
    private: isPrivate,
  };
  subscriptions.add(subscription);
  attach(subscription);
  return () => {
    if (!subscriptions.delete(subscription)) return;
    const key = channelKey(subscription);
    if (!echo || !channels.has(key)) return;
    const subscribedChannel = subscription.private
      ? echo.private(subscription.channel)
      : echo.channel(subscription.channel);
    subscribedChannel.stopListening(subscription.event, subscription.callback);
    const remaining = (channels.get(key) || 1) - 1;
    if (remaining > 0) channels.set(key, remaining);
    else {
      echo.leaveChannel(key);
      channels.delete(key);
      subscribedChannels.delete(key);
      updateReadiness();
    }
  };
};
export const disconnectRealtime = (): void => {
  echo?.disconnect();
  echo = null;
  sessionToken = null;
  channels.clear();
  subscribedChannels.clear();
  transportConnected = false;
  needsResync = true;
  clearResourceHistory();
  setStatus("disabled");
};
export const connectRealtime = (token: string | null): void => {
  if (token === sessionToken && echo) return;
  disconnectRealtime();
  if (!token || !import.meta.env.VITE_PUSHER_APP_KEY) return;
  sessionToken = token;
  setStatus(navigator.onLine ? "connecting" : "offline");
  const secure =
    (import.meta.env.VITE_PUSHER_SCHEME ||
      window.location.protocol.replace(":", "")) === "https";
  echo = new Echo<"pusher">({
    broadcaster: "pusher",
    Pusher,
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1",
    wsHost: import.meta.env.VITE_PUSHER_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_PUSHER_PORT || "6001"),
    wssPort: Number(import.meta.env.VITE_PUSHER_PORT || "6001"),
    forceTLS: secure,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    activityTimeout: 30000,
    pongTimeout: 10000,
    authEndpoint: "/api/broadcasting/auth",
    auth: {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    },
  });
  const client = echo;
  echo.connector.pusher.connection.bind(
    "state_change",
    ({ current }: { current: string }) => {
      if (echo !== client) return;
      transportConnected = current === "connected";
      if (transportConnected) updateReadiness();
      else {
        subscribedChannels.clear();
        needsResync = true;
        setStatus(navigator.onLine ? "reconnecting" : "offline");
      }
    },
  );
  subscriptions.forEach(attach);
};
