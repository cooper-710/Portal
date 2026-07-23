import { describe, expect, it } from "vitest";

import {
  defaultNotificationPreferences,
  isInQuietHours,
  notificationMessage,
  retryDelayMs,
} from "@/lib/notifications/rules";
import type { NotificationEvent } from "@/types/database";

function event(eventType: string, payload: Record<string, unknown> = {}): NotificationEvent {
  return {
    id: "event-id", event_key: `key:${eventType}`, event_type: eventType,
    recipient_id: "user-id", recipient_email: null, actor_id: null,
    freelancer_id: "owner-id", project_id: "project-id", invoice_id: "invoice-id",
    asset_id: null, payload, occurred_at: "2026-07-22T12:00:00Z",
    available_at: "2026-07-22T12:00:00Z", processed_at: null,
    attempt_count: 0, last_error: null, created_at: "2026-07-22T12:00:00Z",
    updated_at: "2026-07-22T12:00:00Z",
  };
}

describe("notification rules", () => {
  it.each([
    "test_notification",
    "client_invited", "client_invite_reminder", "deliverable_review_requested",
    "deliverable_changes_requested", "deliverable_feedback_reviewed",
    "deliverable_approved", "final_approval_requested",
    "final_approval_received", "project_changes_requested", "invoice_created", "invoice_due",
    "invoice_overdue", "payment_succeeded", "payment_failed", "refund_initiated",
    "refund_completed", "refund_failed", "payment_disputed", "project_closed",
  ])("maps %s to a clear deep-linked message", (eventType) => {
    const result = notificationMessage(event(eventType, { amount: 5000, currency: "usd" }));
    expect(result?.title).toBeTruthy();
    expect(result?.body).toBeTruthy();
    expect(result?.href.startsWith("/")).toBe(true);
  });

  it("formats payment amounts from cents", () => {
    expect(notificationMessage(event("payment_succeeded", { amount: 5000, currency: "usd" }))?.body).toContain("$50.00");
  });

  it("notifies a client on every enabled channel when feedback is reviewed", () => {
    const result = notificationMessage(event("deliverable_feedback_reviewed", {
      file_name: "Homepage.png",
    }));

    expect(result).toMatchObject({
      category: "reviews",
      inApp: true,
      email: true,
      push: true,
    });
    expect(result?.body).toContain("Homepage.png");
  });

  it("routes channel tests to exactly one requested channel", () => {
    const email = notificationMessage(event("test_notification", { requested_channel: "email" }));
    expect(email).toMatchObject({ inApp: false, email: true, push: false });
    const push = notificationMessage(event("test_notification", { requested_channel: "push" }));
    expect(push).toMatchObject({ inApp: false, email: false, push: true });
  });

  it("defaults to useful zero-configuration preferences", () => {
    const preferences = defaultNotificationPreferences("user-id");
    expect(preferences.in_app_enabled).toBe(true);
    expect(preferences.email_enabled).toBe(true);
    expect(preferences.push_enabled).toBe(false);
  });

  it("handles overnight and daytime quiet-hour ranges", () => {
    expect(isInQuietHours(new Date("2026-07-23T03:00:00Z"), "UTC", "22:00", "08:00")).toBe(true);
    expect(isInQuietHours(new Date("2026-07-23T14:00:00Z"), "UTC", "22:00", "08:00")).toBe(false);
    expect(isInQuietHours(new Date("2026-07-23T14:00:00Z"), "UTC", "09:00", "17:00")).toBe(true);
  });

  it("uses bounded exponential retry delays", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(20)).toBe(6 * 60 * 60 * 1000);
  });
});
