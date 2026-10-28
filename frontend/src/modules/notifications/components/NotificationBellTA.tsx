import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Bell, CheckCheck, Loader2 } from "lucide-react";
import { ButtonTA } from "@/components/TA/ButtonTA";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/contexts/AuthContext";
import { NotificationFiltersTA } from "@/modules/notifications/components/NotificationFiltersTA";
import { NotificationItemTA } from "@/modules/notifications/components/NotificationItemTA";
import { useNotificationActions } from "@/modules/notifications/useNotificationActions";
import { useNotificationFeed } from "@/modules/notifications/useNotificationFeed";
import { useNotificationNavigation } from "@/modules/notifications/useNotificationNavigation";

// TYPES
interface NotificationBellProps {
  isClient: boolean;
}

// COMPONENT
export const NotificationBellTA = ({ isClient }: NotificationBellProps) => {
  // COMPOSABLES
  const { t } = useTranslation("notificationsUi");

  // STATE
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount } = useNotifications();
  const actions = useNotificationActions();
  const feed = useNotificationFeed(notifications);
  const navigation = useNotificationNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  // COMPUTED
  const busy = actions.pending !== null || navigation.state.pending !== null;
  const error = actions.error || navigation.state.error;

  // LIFECYCLE
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <ButtonTA
            type="button"
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label={
              unreadCount ? t("bellLabel", { count: unreadCount }) : t("title")
            }
          >
            <Bell className="size-[19px]" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[8px] font-semibold leading-3 text-primary-foreground ring-2 ring-card"
                aria-hidden="true"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </ButtonTA>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={12}
        className="w-[min(400px,calc(100vw-24px))] origin-top-right gap-0 overflow-hidden rounded-2xl p-0 shadow-[0_20px_64px_-24px_rgba(15,23,42,0.3)] transition-[opacity,transform] duration-200 ease-out data-[starting-style]:-translate-y-1 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:-translate-y-1 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 motion-reduce:animate-none motion-reduce:transition-none"
      >
        <div className="border-b border-border/70 px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <PopoverTitle className="text-base font-semibold tracking-tight">
              {t("title")}
            </PopoverTitle>
            {unreadCount > 0 && (
              <ButtonTA
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => void actions.markAllRead()}
                className="min-h-9 gap-1.5 px-2 text-[11px] text-primary"
                aria-label={t("markAllReadLabel")}
              >
                {actions.pending === "all" ? (
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}{" "}
                {t("readAll")}
              </ButtonTA>
            )}
          </div>
          <PopoverDescription className="mt-1 text-xs">
            {t("previewDescription")}
          </PopoverDescription>
          <div className="mt-4">
            <NotificationFiltersTA
              filter={feed.view.filter}
              unread={unreadCount}
              onChange={feed.actions.setFilter}
            />
          </div>
        </div>
        {error && (
          <p
            role="status"
            className="mx-4 mt-3 rounded-xl bg-destructive/5 p-3 text-xs leading-relaxed text-destructive"
          >
            {error}
          </p>
        )}
        <div className="max-h-[min(420px,calc(100dvh-290px))] overflow-y-auto overscroll-contain p-2">
          {feed.view.visible.length > 0 ? (
            <ul className="space-y-1">
              {feed.view.visible.slice(0, 8).map((item) => (
                <NotificationItemTA
                  key={item.id}
                  item={item}
                  compact
                  disabled={busy}
                  pending={
                    actions.pending === String(item.id) ||
                    navigation.state.pending === String(item.id)
                  }
                  hasDestination={Boolean(navigation.actions.destination(item))}
                  onRead={() => void actions.markRead(item.id)}
                  onOpen={() => void navigation.actions.open(item)}
                />
              ))}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center" role="status">
              <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                <CheckCheck className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold">{t("upToDate")}</p>
              <p className="mx-auto mt-1.5 max-w-64 text-xs leading-relaxed text-muted-foreground">
                {feed.view.filter === "unread" ? t("noUnread") : t("noItems")}
              </p>
            </div>
          )}
        </div>
        {isClient && (
          <div className="border-t border-border/70 p-2">
            <ButtonTA
              type="button"
              variant="ghost"
              className="w-full justify-between px-3 text-xs text-primary"
              onClick={() => {
                setOpen(false);
                navigate("/cliente/notifications");
              }}
            >
              {t("allNotifications")}{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonTA>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
