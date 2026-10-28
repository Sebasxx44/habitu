import {
  useEffect,
  useLayoutEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import {
  rememberScrollPosition,
  routeScrollPlan,
  type LayoutRoute,
  type LayoutScrollPlan,
  type LayoutScrollPosition,
} from "@/composables/layout/scrollPolicy";

// SESSION STATE
// Public and protected route wrappers can remount the layout during navigation.
const routePositions = new Map<string, LayoutScrollPosition>();
let latestRoute: LayoutRoute | null = null;

// COMPOSABLE
export const useRouteScroll = (
  setMobileOpen: Dispatch<SetStateAction<boolean>>,
): void => {
  // SERVICES
  const location = useLocation();
  const navigationType = useNavigationType();

  // STATE
  const previous = useRef<LayoutRoute | null>(latestRoute);
  const currentKey = useRef(location.key);
  const positions = useRef(routePositions);
  const transition = useRef<{ key: string; plan: LayoutScrollPlan } | null>(
    null,
  );

  // LIFECYCLE
  useEffect(() => {
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const save = () =>
      rememberScrollPosition(positions.current, currentKey.current, {
        left: window.scrollX,
        top: window.scrollY,
      });
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.history.scrollRestoration = restoration;
      window.removeEventListener("scroll", save);
    };
  }, []);

  useLayoutEffect(() => {
    const next: LayoutRoute = {
      key: location.key,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    };
    const plan =
      transition.current?.key === next.key
        ? transition.current.plan
        : routeScrollPlan(
            previous.current,
            next,
            navigationType,
            positions.current.get(next.key),
          );
    transition.current = { key: next.key, plan };
    previous.current = next;
    latestRoute = next;
    currentKey.current = next.key;
    setMobileOpen(false);
    if (plan.kind === "preserve") {
      rememberScrollPosition(positions.current, next.key, {
        left: window.scrollX,
        top: window.scrollY,
      });
      return;
    }

    let frame = 0;
    let stopped = false;
    let observer: ResizeObserver | undefined;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      clearTimeout(timeout);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
    const restore = () => {
      if (stopped) return;
      if (plan.kind === "anchor") {
        const anchor = document.getElementById(plan.id);
        if (!anchor) return;
        anchor.scrollIntoView({ block: "start", behavior: "instant" });
        rememberScrollPosition(positions.current, next.key, {
          left: window.scrollX,
          top: window.scrollY,
        });
        stop();
        return;
      }
      const position =
        plan.kind === "position" ? plan.position : { left: 0, top: 0 };
      window.scrollTo({ ...position, behavior: "instant" });
      rememberScrollPosition(positions.current, next.key, {
        left: window.scrollX,
        top: window.scrollY,
      });
      if (
        document.documentElement.scrollHeight - window.innerHeight >=
          position.top ||
        position.top === 0
      )
        stop();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    };
    const content = document.getElementById("main-content");
    if (content && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(schedule);
      observer.observe(content);
    }
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const timeout = setTimeout(stop, 10000);
    schedule();
    return stop;
  }, [
    location.key,
    location.pathname,
    location.search,
    location.hash,
    navigationType,
    setMobileOpen,
  ]);
};
