import { describe, expect, it } from "vitest";

import { mergeLiveNotification } from "@/lib/notifications/live-state";
import type { Notification } from "@/types/database";

function notification(id: string, createdAt: string, readAt: string | null = null): Notification {
  return {
    id,
    event_id: `event-${id}`,
    user_id: "user-1",
    notification_type: "payment_succeeded",
    title: "Payment received",
    body: "$50.00 was paid successfully.",
    href: "/dashboard/invoices",
    read_at: readAt,
    created_at: createdAt,
  };
}

describe("live notification state", () => {
  it("places a Realtime insert first and increments unread state without refresh", () => {
    const existing = notification("old", "2026-07-23T01:00:00Z", "2026-07-23T01:01:00Z");
    const payment = notification("payment", "2026-07-23T01:10:11Z");
    const result = mergeLiveNotification([existing], payment);
    expect(result.map((item) => item.id)).toEqual(["payment", "old"]);
    expect(result.filter((item) => !item.read_at)).toHaveLength(1);
  });

  it("merges Realtime updates without duplicating the row", () => {
    const unread = notification("payment", "2026-07-23T01:10:11Z");
    const read = { ...unread, read_at: "2026-07-23T01:11:00Z" };
    expect(mergeLiveNotification([unread], read)).toEqual([read]);
  });
});

