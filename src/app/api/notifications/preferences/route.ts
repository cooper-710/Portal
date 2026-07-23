import { NextResponse } from "next/server";

import { defaultNotificationPreferences } from "@/lib/notifications/rules";
import type { NotificationPreferences } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

const editable = [
  "in_app_enabled", "email_enabled", "push_enabled", "quiet_hours_enabled",
  "quiet_hours_start", "quiet_hours_end", "timezone", "invites_enabled",
  "reviews_enabled", "invoices_enabled", "payments_enabled", "projects_enabled",
] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data ?? defaultNotificationPreferences(user.id) });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Partial<NotificationPreferences>;
  const changes: Partial<NotificationPreferences> = {};
  for (const key of editable) {
    if (body[key] !== undefined) Object.assign(changes, { [key]: body[key] });
  }
  if (typeof changes.timezone === "string") {
    try { new Intl.DateTimeFormat("en-US", { timeZone: changes.timezone }).format(); }
    catch { return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 }); }
  }
  const row = { ...defaultNotificationPreferences(user.id), ...changes, user_id: user.id };
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ preferences: data });
}
