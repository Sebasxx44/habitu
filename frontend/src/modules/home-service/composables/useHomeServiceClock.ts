import { useEffect, useState } from "react";

// COMPOSABLE
export const useHomeServiceClock = (enabled = true): number => {
  // STATE
  const [now, setNow] = useState(Date.now);

  // LIFECYCLE
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    const timer = window.setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled]);

  // RETURN
  return now;
};
