import type { Notification } from "@/types/database";

const MAX_NOTIFICATIONS = 40;

/** Merge an INSERT/UPDATE Realtime payload without duplicating a notification. */
export function mergeLiveNotification(
  notifications: Notification[],
  incoming: Notification,
) {
  return [incoming, ...notifications.filter((item) => item.id !== incoming.id)]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, MAX_NOTIFICATIONS);
}

