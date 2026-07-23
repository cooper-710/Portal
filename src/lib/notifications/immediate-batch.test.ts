import { describe, expect, it, vi } from "vitest";

import { runImmediateDeliveryBatch } from "@/lib/notifications/immediate-batch";
import { notificationMessage } from "@/lib/notifications/rules";
import type { NotificationEvent } from "@/types/database";

describe("immediate notification delivery", () => {
  it("attempts payment email and push deliveries in the same processing pass", async () => {
    const event: NotificationEvent = {
      id: "payment-event", event_key: "invoice:paid:owner", event_type: "payment_succeeded",
      recipient_id: "owner", recipient_email: null, actor_id: null, freelancer_id: "owner",
      project_id: "project", invoice_id: "invoice", asset_id: null,
      payload: { amount: 5_000, currency: "usd" }, occurred_at: "2026-07-23T01:10:11Z",
      available_at: "2026-07-23T01:10:11Z", processed_at: null, attempt_count: 0,
      last_error: null, created_at: "2026-07-23T01:10:11Z", updated_at: "2026-07-23T01:10:11Z",
    };
    const message = notificationMessage(event);
    const queued: Array<{ channel: "email" | "push"; createdAt: string }> = [];
    const attempted: string[] = [];
    const materialize = vi.fn(async () => {
      if (message?.email) queued.push({ channel: "email", createdAt: "2026-07-23T01:10:11.450Z" });
      if (message?.push) queued.push({ channel: "push", createdAt: "2026-07-23T01:10:11.451Z" });
      return 1;
    });
    const loadDueDeliveries = vi.fn(async (cutoff: string) =>
      queued.filter((delivery) => delivery.createdAt <= cutoff));
    const deliver = vi.fn(async (delivery: { channel: "email" | "push" }) => {
      attempted.push(delivery.channel);
    });

    const result = await runImmediateDeliveryBatch({
      materialize,
      loadDueDeliveries,
      deliver,
      now: () => "2026-07-23T01:10:11.452Z",
    });

    expect(materialize).toHaveBeenCalledOnce();
    expect(loadDueDeliveries).toHaveBeenCalledWith("2026-07-23T01:10:11.452Z");
    expect(attempted).toEqual(["email", "push"]);
    expect(result).toEqual({ events: 1, deliveries: 2 });
  });
});
