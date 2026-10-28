import { useLayoutEffect, useRef, type RefObject } from "react";

// COMPOSABLE
export const useBottomNavHeight = (): RefObject<HTMLElement> => {
  // STATE
  const ref = useRef<HTMLElement | null>(null);

  // LIFECYCLE
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const root = document.documentElement;
    const measure = () =>
      root.style.setProperty(
        "--bottom-nav-height",
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      );
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      root.style.setProperty("--bottom-nav-height", "0px");
    };
  }, []);

  // EXPOSE
  return ref;
};
