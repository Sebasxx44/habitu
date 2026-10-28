import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import type { MobileLayoutResult } from "@/composables/layout/types";

// COMPOSABLE
export const useMobileLayout = (
  setMobileOpen: Dispatch<SetStateAction<boolean>>,
): MobileLayoutResult => {
  // SERVICES
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  // STATE
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const previousPath = useRef(pathname);

  // LIFECYCLE
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setMobileOpen(false);
    if (navigationType !== "POP" && !hash) window.scrollTo({ top: 0 });
  }, [pathname, hash, navigationType, setMobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeMenu = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener("change", closeMenu);
    return () => desktop.removeEventListener("change", closeMenu);
  }, [setMobileOpen]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboard = () => {
      const element = document.activeElement;
      const editable =
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        (element instanceof HTMLElement && element.isContentEditable);
      setKeyboardOpen(editable && window.innerHeight - viewport.height > 150);
    };
    viewport.addEventListener("resize", updateKeyboard);
    document.addEventListener("focusin", updateKeyboard);
    document.addEventListener("focusout", updateKeyboard);
    return () => {
      viewport.removeEventListener("resize", updateKeyboard);
      document.removeEventListener("focusin", updateKeyboard);
      document.removeEventListener("focusout", updateKeyboard);
    };
  }, []);

  // EXPOSE
  return { viewport: { keyboardOpen } };
};
