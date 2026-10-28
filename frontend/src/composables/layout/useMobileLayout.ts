import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { MobileLayoutResult } from "@/composables/layout/types";
import { useRouteScroll } from "@/composables/layout/useRouteScroll";
import { hasTextFocus, hasVirtualKeyboard } from "@/composables/layout/viewportPolicy";

// COMPOSABLE
export const useMobileLayout = (
  setMobileOpen: Dispatch<SetStateAction<boolean>>,
): MobileLayoutResult => {
  // COMPOSABLES
  useRouteScroll(setMobileOpen);

  // STATE
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // LIFECYCLE
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const root = document.documentElement;
    const previousHeight = root.style.getPropertyValue("--app-header-height");
    const closeMenu = () => {
      root.style.setProperty("--app-header-height", desktop.matches ? "76px" : "56px");
      if (desktop.matches) setMobileOpen(false);
    };
    closeMenu();
    desktop.addEventListener("change", closeMenu);
    return () => {
      desktop.removeEventListener("change", closeMenu);
      if (previousHeight) root.style.setProperty("--app-header-height", previousHeight);
      else root.style.removeProperty("--app-header-height");
    };
  }, [setMobileOpen]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let baselineHeight = Math.max(window.innerHeight, viewport.height);
    let frame = 0;
    const updateKeyboard = () => {
      const editable = hasTextFocus(document.activeElement);
      baselineHeight = editable ? Math.max(baselineHeight, window.innerHeight, viewport.height) : Math.max(window.innerHeight, viewport.height);
      setKeyboardOpen(hasVirtualKeyboard({ editable, layoutHeight: baselineHeight, viewportHeight: viewport.height, scale: viewport.scale }));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateKeyboard);
    };
    const resetOrientation = () => {
      baselineHeight = Math.max(window.innerHeight, viewport.height);
      schedule();
    };
    schedule();
    viewport.addEventListener("resize", schedule);
    viewport.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", resetOrientation);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", schedule);
      viewport.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", resetOrientation);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, []);

  // EXPOSE
  return { viewport: { keyboardOpen } };
};
