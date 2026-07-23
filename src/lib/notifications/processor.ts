import "server-only";

import { Resend } from "resend";
import webpush from "web-push";

import {
  categoryEnabled,
  defaultNotificationPreferences,
  isInQuietHours,
  notificationMessage,
  retryDelayMs,
} from "@/lib/notifications/rules";
import type {
  Invoice,
  NotificationDelivery,
  NotificationEvent,
  NotificationPreferences,
  Project,
} from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";

const truthy = (value: string | undefined, fallback = true) =>
  value == null ? fallback : !["0", "false", "off", "disabled"].includes(value.toLowerCase());

export function notificationKillSwitches() {
  return {
    all: truthy(process.env.NOTIFICATIONS_ENABLED),
    email: truthy(process.env.NOTIFICATION_EMAILS_ENABLED),
    push: truthy(process.env.NOTIFICATION_PUSH_ENABLED),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function preferencesFor(userId: string | null) {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as NotificationPreferences | null) ?? defaultNotificationPreferences(userId);
}

async function recipientEmail(userId: string | null, fallback: string | null) {
  if (fallback) return fallback;
  if (!userId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("email").eq("id", userId).maybeSingle();
  return data?.email ?? null;
}

async function shouldSkipInviteReminder(event: NotificationEvent) {
  if (event.event_type !== "client_invite_reminder" || !event.project_id) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("projects")
    .select("client_id")
    .eq("id", event.project_id)
    .maybeSingle();
  return Boolean(data?.client_id);
}

async function materializeEvent(event: NotificationEvent) {
  const admin = createAdminClient();
  const message = notificationMessage(event);
  if (!message || await shouldSkipInviteReminder(event)) {
    await admin.from("notification_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
    return;
  }

  const preferences = await preferencesFor(event.recipient_id);
  const enabled = !preferences || categoryEnabled(preferences, message.category);
  let notificationId: string | null = null;

  if (enabled && event.recipient_id && message.inApp && (preferences?.in_app_enabled ?? true)) {
    const { error } = await admin.from("notifications").upsert({
      event_id: event.id,
      user_id: event.recipient_id,
      notification_type: event.event_type,
      title: message.title,
      body: message.body,
      href: message.href,
    }, { onConflict: "event_id,user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    const { data } = await admin
      .from("notifications")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", event.recipient_id)
      .maybeSingle();
    notificationId = data?.id ?? null;
  }

  const switches = notificationKillSwitches();
  const deliveries: Array<{
    event_id: string;
    notification_id: string | null;
    user_id: string | null;
    recipient_email: string | null;
    channel: "email" | "push";
    dedupe_key: string;
  }> = [];
  if (enabled && switches.email && message.email && (preferences?.email_enabled ?? true)) {
    deliveries.push({
      event_id: event.id,
      notification_id: notificationId,
      user_id: event.recipient_id,
      recipient_email: event.recipient_email,
      channel: "email",
      dedupe_key: `${event.event_key}:email`,
    });
  }
  if (
    enabled && switches.push && message.push && event.recipient_id &&
    Boolean(preferences?.push_enabled)
  ) {
    deliveries.push({
      event_id: event.id,
      notification_id: notificationId,
      user_id: event.recipient_id,
      recipient_email: null,
      channel: "push",
      dedupe_key: `${event.event_key}:push`,
    });
  }
  if (deliveries.length > 0) {
    const { error } = await admin
      .from("notification_deliveries")
      .upsert(deliveries, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  await admin.from("notification_events").update({
    processed_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", event.id);
}

async function deliverEmail(delivery: NotificationDelivery, event: NotificationEvent) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: "RESEND_API_KEY is not configured." } as const;
  const to = await recipientEmail(delivery.user_id, delivery.recipient_email);
  if (!to) return { skipped: "Notification recipient has no email." } as const;
  const message = notificationMessage(event);
  if (!message) return { skipped: "Notification rule no longer exists." } as const;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const href = message.href.startsWith("http") ? message.href : `${appUrl}${message.href}`;
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Portal <notifications@example.com>",
    to,
    subject: message.title,
    html: `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:#fafafa;padding:28px 16px"><div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px"><p style="font-size:12px;font-weight:700;color:#f97316;margin:0 0 8px">PORTAL</p><h1 style="font-size:20px;color:#18181b;margin:0 0 10px">${escapeHtml(message.title)}</h1><p style="font-size:14px;line-height:1.55;color:#52525b;margin:0 0 18px">${escapeHtml(message.body)}</p><a href="${escapeHtml(href)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 15px;border-radius:8px">Open Portal</a></div></div>`,
  }, { idempotencyKey: delivery.dedupe_key.slice(0, 256) });
  if (error) throw new Error(error.message);
  return { providerId: data?.id ?? null } as const;
}

async function deliverPush(delivery: NotificationDelivery, event: NotificationEvent) {
  if (!delivery.user_id) return { skipped: "Push delivery has no user." } as const;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { skipped: "VAPID keys are not configured." } as const;
  const message = notificationMessage(event);
  if (!message) return { skipped: "Notification rule no longer exists." } as const;

  const admin = createAdminClient();
  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", delivery.user_id);
  if (error) throw new Error(error.message);
  if (!subscriptions?.length) return { skipped: "No active browser subscription." } as const;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@example.com",
    publicKey,
    privateKey,
  );
  let delivered = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify({ title: message.title, body: message.body, url: message.href }), {
        TTL: 60 * 60,
        urgency: "normal",
      });
      delivered += 1;
      await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", subscription.id);
    } catch (pushError) {
      const statusCode = typeof pushError === "object" && pushError && "statusCode" in pushError
        ? Number(pushError.statusCode)
        : null;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", subscription.id);
        continue;
      }
      throw pushError;
    }
  }
  if (delivered === 0) return { skipped: "All browser subscriptions expired." } as const;
  return { providerId: `push:${delivered}` } as const;
}

async function processDelivery(delivery: NotificationDelivery) {
  const admin = createAdminClient();
  const now = new Date();
  const { data: claimed } = await admin
    .from("notification_deliveries")
    .update({ status: "processing", locked_at: now.toISOString() })
    .eq("id", delivery.id)
    .in("status", ["pending", "retry"])
    .select("*")
    .maybeSingle();
  if (!claimed) return;

  const preferences = await preferencesFor(claimed.user_id);
  if (
    preferences?.quiet_hours_enabled &&
    isInQuietHours(
      now,
      preferences.timezone,
      preferences.quiet_hours_start,
      preferences.quiet_hours_end,
    )
  ) {
    await admin.from("notification_deliveries").update({
      status: "retry",
      locked_at: null,
      next_attempt_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      last_error: "Deferred for quiet hours.",
    }).eq("id", claimed.id);
    return;
  }

  const { data: event } = await admin
    .from("notification_events")
    .select("*")
    .eq("id", claimed.event_id)
    .single();
  if (!event) throw new Error("Notification event no longer exists.");

  try {
    const result = claimed.channel === "email"
      ? await deliverEmail(claimed as NotificationDelivery, event as NotificationEvent)
      : await deliverPush(claimed as NotificationDelivery, event as NotificationEvent);
    if ("skipped" in result) {
      await admin.from("notification_deliveries").update({
        status: "skipped",
        locked_at: null,
        last_error: result.skipped,
      }).eq("id", claimed.id);
    } else {
      await admin.from("notification_deliveries").update({
        status: "delivered",
        locked_at: null,
        delivered_at: new Date().toISOString(),
        provider_id: result.providerId,
        last_error: null,
      }).eq("id", claimed.id);
    }
  } catch (error) {
    const attempt = claimed.attempt_count + 1;
    const failed = attempt >= claimed.max_attempts;
    await admin.from("notification_deliveries").update({
      status: failed ? "failed" : "retry",
      attempt_count: attempt,
      locked_at: null,
      next_attempt_at: new Date(Date.now() + retryDelayMs(attempt)).toISOString(),
      last_error: error instanceof Error ? error.message : "Notification delivery failed.",
    }).eq("id", claimed.id);
  }
}

export async function processNotificationOutbox(options?: {
  maxEvents?: number;
  maxDeliveries?: number;
}) {
  const switches = notificationKillSwitches();
  if (!switches.all) return { disabled: true, events: 0, deliveries: 0 };
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const staleLock = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin
    .from("notification_deliveries")
    .update({ status: "retry", locked_at: null, next_attempt_at: now, last_error: "Recovered a stale delivery lock." })
    .eq("status", "processing")
    .lt("locked_at", staleLock);
  const { data: events, error } = await admin
    .from("notification_events")
    .select("*")
    .is("processed_at", null)
    .lte("available_at", now)
    .order("created_at")
    .limit(options?.maxEvents ?? 25);
  if (error) throw new Error(error.message);

  let eventCount = 0;
  for (const event of events ?? []) {
    try {
      await materializeEvent(event as NotificationEvent);
      eventCount += 1;
    } catch (eventError) {
      const attempts = event.attempt_count + 1;
      await admin.from("notification_events").update({
        attempt_count: attempts,
        available_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString(),
        last_error: eventError instanceof Error ? eventError.message : "Notification materialization failed.",
      }).eq("id", event.id);
    }
  }

  const { data: deliveries, error: deliveryError } = await admin
    .from("notification_deliveries")
    .select("*")
    .in("status", ["pending", "retry"])
    .lte("next_attempt_at", now)
    .order("created_at")
    .limit(options?.maxDeliveries ?? 25);
  if (deliveryError) throw new Error(deliveryError.message);
  for (const delivery of deliveries ?? []) {
    await processDelivery(delivery as NotificationDelivery);
  }
  return { disabled: false, events: eventCount, deliveries: deliveries?.length ?? 0 };
}

function daysBetween(left: string, right: string) {
  const a = Date.parse(`${left}T12:00:00.000Z`);
  const b = Date.parse(`${right}T12:00:00.000Z`);
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}

export async function enqueueScheduledInvoiceReminders(today = new Date().toISOString().slice(0, 10)) {
  const admin = createAdminClient();
  const { data: invoices, error } = await admin
    .from("invoices")
    .select("*")
    .in("status", ["pending", "processing"])
    .not("due_date", "is", null)
    .lte("due_date", today);
  if (error) throw new Error(error.message);

  let created = 0;
  for (const invoice of (invoices ?? []) as Invoice[]) {
    if (!invoice.due_date) continue;
    const overdueDays = daysBetween(today, invoice.due_date);
    const eventType = overdueDays === 0 ? "invoice_due" : "invoice_overdue";
    if (overdueDays > 1 && overdueDays % 7 !== 0) continue;
    const { data: project } = await admin
      .from("projects")
      .select("*")
      .eq("id", invoice.project_id)
      .maybeSingle();
    if (!project) continue;
    const typedProject = project as Project;
    const payload = {
      amount: invoice.amount,
      currency: invoice.currency,
      title: invoice.title,
      due_date: invoice.due_date,
      project_title: typedProject.title,
      overdue_days: overdueDays,
    };
    const recipients = [
      { suffix: "owner", id: typedProject.freelancer_id, email: null },
      { suffix: "client", id: typedProject.client_id, email: typedProject.client_email },
    ];
    for (const recipient of recipients) {
      if (!recipient.id && !recipient.email) continue;
      const { error: insertError } = await admin.from("notification_events").insert({
        event_key: `invoice:${invoice.id}:${eventType}:${overdueDays}:${recipient.suffix}`,
        event_type: eventType,
        recipient_id: recipient.id,
        recipient_email: recipient.email,
        actor_id: typedProject.freelancer_id,
        freelancer_id: typedProject.freelancer_id,
        project_id: typedProject.id,
        invoice_id: invoice.id,
        asset_id: null,
        payload,
      });
      if (!insertError) created += 1;
      else if (insertError.code !== "23505") throw new Error(insertError.message);
    }
  }
  return created;
}
