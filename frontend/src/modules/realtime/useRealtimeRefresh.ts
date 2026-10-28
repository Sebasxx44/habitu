import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getRealtimeSnapshot,
  observeConnection,
} from "@/modules/realtime/connection";
import {
  matchesTopics,
  subscribeResourceChanges,
} from "@/modules/realtime/resourceBus";
import type {
  RefreshOptions,
  RealtimeSnapshot,
} from "@/modules/realtime/types";

// COMPOSABLES
export const useRealtimeStatus = (): RealtimeSnapshot =>
  useSyncExternalStore(
    observeConnection,
    getRealtimeSnapshot,
    getRealtimeSnapshot,
  );
export const useRealtimeRefresh = (
  topics: readonly string[],
  refresh: () => void | Promise<void>,
  options: RefreshOptions = {},
): RealtimeSnapshot => {
  const snapshot = useRealtimeStatus();
  const callback = useRef(refresh);
  callback.current = refresh;
  const key = [...new Set(topics)].sort().join(",");
  const { enabled = true, fallbackMs = 60000, minIntervalMs = 2000 } = options;
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let dirty = false;
    let busy = false;
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async (): Promise<void> => {
      timer = undefined;
      if (
        !active ||
        !dirty ||
        busy ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      dirty = false;
      busy = true;
      last = Date.now();
      try {
        await callback.current();
      } catch {
        /* The consumer renders its own recoverable error state. */
      } finally {
        busy = false;
        if (active && dirty) schedule();
      }
    };
    const schedule = (): void => {
      dirty = true;
      if (
        timer ||
        busy ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      timer = setTimeout(
        () => {
          void run();
        },
        Math.max(400, minIntervalMs - (Date.now() - last)),
      );
    };
    const unsubscribe = subscribeResourceChanges((change) => {
      if (matchesTopics(key.split(","), change.topics)) schedule();
    });
    const restore = (): void => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", restore);
    window.addEventListener("online", restore);
    const fallback = window.setInterval(
      () => {
        if (!getRealtimeSnapshot().connected) schedule();
      },
      Math.max(30000, fallbackMs),
    );
    return () => {
      active = false;
      unsubscribe();
      if (timer) clearTimeout(timer);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", restore);
      window.removeEventListener("online", restore);
    };
  }, [key, enabled, fallbackMs, minIntervalMs]);
  return snapshot;
};
export const useRealtimeRevision = (
  topics: readonly string[],
  options: RefreshOptions = {},
): number => {
  const [revision, setRevision] = useState(0);
  useRealtimeRefresh(topics, () => setRevision((value) => value + 1), options);
  return revision;
};
