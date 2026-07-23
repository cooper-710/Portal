import { NextResponse } from "next/server";

import { notificationKillSwitches, processNotificationOutbox } from "@/lib/notifications/processor";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import type { NotificationDelivery, NotificationPreferences } from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const channels = new Set(["in_app", "email", "push"] as const);
type TestChannel = "in_app" | "email" | "push";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimit(`notification-test:${user.id}`, { limit: 6, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Please wait a minute before sending another test." },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }

  const body = await request.json().catch(() => ({})) as { channel?: string };
  if (!body.channel || !channels.has(body.channel as TestChannel)) {
    return NextResponse.json({ error: "Choose in_app, email, or push." }, { status: 400 });
  }
  const channel = body.channel as TestChannel;
  const admin = createAdminClient();
  const eventId = crypto.randomUUID();
  const { error: insertError } = await admin.from("notification_events").insert({
    id: eventId,
    event_key: `notification-test:${user.id}:${eventId}`,
    event_type: "test_notification",
    recipient_id: user.id,
    recipient_email: user.email ?? null,
    actor_id: user.id,
    freelancer_id: null,
    project_id: null,
    invoice_id: null,
    asset_id: null,
    payload: { requested_channel: channel },
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const processed = await processNotificationOutbox({
    eventIds: [eventId],
    maxEvents: 1,
    maxDeliveries: 2,
  });
  if (processed.disabled) {
    return NextResponse.json({ channel, status: "skipped", reason: "NOTIFICATIONS_ENABLED is disabled." });
  }

  if (channel === "in_app") {
    const { data: notification } = await admin
      .from("notifications")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (notification) return NextResponse.json({ channel, status: "delivered" });
  } else {
    const { data: delivery } = await admin
      .from("notification_deliveries")
      .select("*")
      .eq("event_id", eventId)
      .eq("channel", channel)
      .maybeSingle();
    if (delivery) {
      const typed = delivery as NotificationDelivery;
      return NextResponse.json({
        channel,
        status: typed.status,
        reason: typed.last_error,
        providerAccepted: typed.status === "delivered",
      });
    }
  }

  const { data: storedPreferences } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const preferences = storedPreferences as NotificationPreferences | null;
  const switches = notificationKillSwitches();
  const reason = channel === "in_app"
    ? preferences?.in_app_enabled === false ? "In-app notifications are disabled in your preferences." : "The in-app test was not materialized."
    : channel === "email"
      ? !switches.email ? "NOTIFICATION_EMAILS_ENABLED is disabled." : preferences?.email_enabled === false ? "Email is disabled in your preferences." : "No email delivery was created."
      : !switches.push ? "NOTIFICATION_PUSH_ENABLED is disabled." : preferences?.push_enabled !== true ? "Browser push is not enabled for this user." : "No push delivery was created.";
  return NextResponse.json({ channel, status: "skipped", reason });
}
