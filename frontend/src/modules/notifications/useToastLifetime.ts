import { useEffect, useRef, useState } from "react";

// COMPOSABLE
export const useToastLifetime = (
  id: string,
  duration: number,
  paused: boolean,
  onDismiss: (id: string) => void,
): void => {
  // STATE
  const remaining = useRef(duration);
  const [hidden, setHidden] = useState(() => document.hidden);

  // LIFECYCLE
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused || hidden) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      );
    };
  }, [hidden, id, onDismiss, paused]);
};
