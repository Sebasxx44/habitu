import { useTranslation } from "react-i18next";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import type { NotificationFilter } from "@/modules/notifications/types";

// TYPES
interface NotificationFiltersProps {
  filter: NotificationFilter;
  unread: number;
  onChange: (filter: NotificationFilter) => void;
}

// COMPONENT
export const NotificationFiltersTA = ({
  filter,
  unread,
  onChange,
}: NotificationFiltersProps) => {
  // COMPOSABLES
  const { t } = useTranslation("notificationsUi");

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl bg-muted/70 p-1"
      role="group"
      aria-label={t("filterLabel")}
    >
      <ButtonTA
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={filter === "all"}
        onClick={() => onChange("all")}
        className={cn(
          "min-h-9 rounded-lg px-4 text-xs motion-reduce:transition-none",
          filter === "all"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
      >
        {t("all")}
      </ButtonTA>
      <ButtonTA
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={filter === "unread"}
        onClick={() => onChange("unread")}
        className={cn(
          "min-h-9 gap-2 rounded-lg px-4 text-xs motion-reduce:transition-none",
          filter === "unread"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
      >
        {t("unread")}
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
            unread
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {unread}
        </span>
      </ButtonTA>
    </div>
  );
};
