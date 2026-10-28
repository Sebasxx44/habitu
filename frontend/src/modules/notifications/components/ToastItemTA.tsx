import { useTranslation } from "react-i18next";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import { useToastLifetime } from "@/modules/notifications/useToastLifetime";
import type { ToastMessage } from "@/modules/notifications/types";

// TYPES
interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

// COMPONENT
export const ToastItemTA = ({ toast, onDismiss }: ToastItemProps) => {
  // COMPOSABLES
  const { t } = useTranslation("notificationsUi");

  // STATE
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();

  // LIFECYCLE
  useToastLifetime(
    toast.id,
    toast.type === "error" ? 9000 : 6000,
    hovered || focused,
    onDismiss,
  );

  // COMPUTED
  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
        ? AlertCircle
        : Info;

  return (
    <motion.li
      layout={!reducedMotion}
      initial={{
        opacity: 0,
        y: reducedMotion ? 0 : -8,
        scale: reducedMotion ? 1 : 0.98,
      }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: reducedMotion ? 0 : -4,
        scale: reducedMotion ? 1 : 0.98,
      }}
      transition={{
        duration: reducedMotion ? 0 : 0.24,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.25)] backdrop-blur-xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onDismiss(toast.id);
        }
      }}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          toast.type === "success"
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : toast.type === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 pt-0.5" role="status" aria-atomic="true">
        <p className="break-words text-sm font-semibold leading-5 text-foreground">
          {toast.message}
        </p>
        {toast.description && (
          <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <ButtonTA
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onDismiss(toast.id)}
        aria-label={t("closeToast")}
      >
        <X className="size-4" aria-hidden="true" />
      </ButtonTA>
    </motion.li>
  );
};
