import { NextResponse } from "next/server";

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
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: request.headers.get("user-agent"),
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    push_enabled: true,
  }, { onConflict: "user_id" });
  return NextResponse.json({ success: true });
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
  await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    push_enabled: false,
  }, { onConflict: "user_id" });
  return NextResponse.json({ success: true });
}
