import { NextResponse } from "next/server";

import { stalePushSubscriptionIds } from "@/lib/notifications/push-origin";
import { appBaseUrl } from "@/lib/product";
import { createClient } from "@/utils/supabase/server";

type SubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as SubscriptionBody;
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }
  const currentOrigin = new URL(
    request.headers.get("origin") ?? request.url,
  ).origin.toLowerCase();
  const canonicalOrigin = new URL(appBaseUrl()).origin.toLowerCase();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    origin: currentOrigin,
    user_agent: request.headers.get("user-agent"),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, origin")
    .eq("user_id", user.id);
  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 400 });
  }
  const staleIds = stalePushSubscriptionIds(
    subscriptions ?? [],
    body.endpoint,
    currentOrigin,
    canonicalOrigin,
  );
  if (staleIds.length > 0) {
    const { error: cleanupError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", staleIds);
    if (cleanupError) {
      return NextResponse.json({ error: cleanupError.message }, { status: 400 });
    }
  }

  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    push_enabled: true,
  }, { onConflict: "user_id" });
  return NextResponse.json({
    success: true,
    pushEnabled: true,
    origin: currentOrigin,
    removedStaleSubscriptions: staleIds.length,
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { endpoint?: string };
  let query = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  if (body.endpoint) query = query.eq("endpoint", body.endpoint);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { count, error: countError } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }
  const pushEnabled = (count ?? 0) > 0;
  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    push_enabled: pushEnabled,
  }, { onConflict: "user_id" });
  return NextResponse.json({ success: true, pushEnabled });
}
