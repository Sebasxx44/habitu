import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Gift,
  Loader2,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import { cn } from "@/lib/utils";
import { formatDate } from "@/i18n/formatters";
import type { AppNotification } from "@/types/notifications";

// TYPES
interface NotificationItemProps {
  item: AppNotification;
  compact?: boolean;
  pending: boolean;
  disabled: boolean;
  hasDestination: boolean;
  onOpen: () => void;
  onRead: () => void;
}

// COMPONENT
export const NotificationItemTA = ({
  item,
  compact = false,
  pending,
  disabled,
  hasDestination,
  onOpen,
  onRead,
}: NotificationItemProps) => {
  // COMPOSABLES
  const { t } = useTranslation("notificationsUi");

  // COMPUTED
  const type = item.type.toLowerCase();
  const Icon = /appointment|booking|reminder/.test(type)
    ? CalendarDays
    : /reward|loyalty|gift/.test(type)
      ? Gift
      : /payment|wallet/.test(type)
        ? Wallet
        : /message|chat/.test(type)
          ? MessageCircle
          : Bell;

  return (
    <li
      className={cn(
        "group relative flex gap-3 transition-colors duration-300 motion-reduce:transition-none",
        compact ? "rounded-xl p-3" : "gap-4 px-4 py-5 sm:px-6",
        item.read
          ? "hover:bg-muted/40"
          : "bg-primary/[0.035] hover:bg-primary/[0.065]",
      )}
      aria-busy={pending}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl",
          compact ? "size-9" : "size-11",
          item.read
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "leading-5 text-foreground",
              compact ? "text-xs" : "text-sm",
              item.read ? "font-medium" : "font-semibold",
            )}
          >
            {item.title}
          </p>
          {!item.read && (
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
              aria-label={t("unread")}
            />
          )}
        </div>
        <p
          className={cn(
            "mt-1 break-words leading-relaxed text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {item.message}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <time
            dateTime={item.created_at}
            className="text-[11px] text-muted-foreground"
          >
            {formatDate(item.created_at, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
          <div className="flex items-center gap-1">
            {!item.read && (
              <ButtonTA
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 gap-1.5 px-2 text-[11px] text-muted-foreground"
                disabled={disabled}
                onClick={onRead}
                aria-label={t("markReadLabel", { title: item.title })}
              >
                {pending ? (
                  <Loader2
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Check className="size-3.5" aria-hidden="true" />
                )}
                {t(compact ? "markReadShort" : "markRead")}
              </ButtonTA>
            )}
            {hasDestination && (
              <ButtonTA
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 gap-1 px-2 text-[11px] text-primary"
                disabled={disabled}
                onClick={onOpen}
                aria-label={t("detailLabel", { title: item.title })}
              >
                {t("detail")}{" "}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </ButtonTA>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};
