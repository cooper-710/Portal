import { NextResponse } from "next/server";

import { processNotificationOutbox } from "@/lib/notifications/processor";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await processNotificationOutbox({ maxEvents: 15, maxDeliveries: 10 });
  } catch (error) {
    // The center stays usable if a provider or pending migration is unavailable.
    console.error("[notifications] background processing failed:", error);
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    notifications: data ?? [],
    unread: (data ?? []).filter((item) => !item.read_at).length,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; all?: boolean };
  const readAt = new Date().toISOString();
  let query = supabase.from("notifications").update({ read_at: readAt });
  query = body.all ? query.is("read_at", null) : query.eq("id", body.id ?? "");
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, readAt });
}
