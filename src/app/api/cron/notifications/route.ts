import { NextResponse } from "next/server";

import {
  enqueueScheduledInvoiceReminders,
  processNotificationOutbox,
} from "@/lib/notifications/processor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reminders = await enqueueScheduledInvoiceReminders();
  const processed = await processNotificationOutbox({
    maxEvents: 100,
    maxDeliveries: 100,
    mode: "maintenance",
  });
  return NextResponse.json({ success: true, reminders, processed });
}
