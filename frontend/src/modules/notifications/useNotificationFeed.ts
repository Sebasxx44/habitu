import { useState } from "react";
import type { AppNotification } from "@/types/notifications";
import type {
  NotificationFeedState,
  NotificationFilter,
} from "@/modules/notifications/types";

// COMPOSABLE
export const useNotificationFeed = (
  items: AppNotification[],
): NotificationFeedState => {
  // STATE
  const [filter, setFilter] = useState<NotificationFilter>("all");

  // COMPUTED
  const unread = items.filter((item) => !item.read).length;
  const visible =
    filter === "unread" ? items.filter((item) => !item.read) : items;

  return { view: { filter, visible, unread }, actions: { setFilter } };
};
