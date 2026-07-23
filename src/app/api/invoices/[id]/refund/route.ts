import { NextResponse } from "next/server";
import Stripe from "stripe";

import { logEvent, requestContext } from "@/lib/monitoring";
import type { Invoice, Project } from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  connectedAccountRequestOptions,
  requireTestModeDirectCharges,
} from "@/utils/stripe/direct-charge";
import {
  canRequestInvoiceRefund,
  invoiceRefundIdempotencyKey,
  refundableInvoiceAmount,
  validateInvoiceRefundAmount,
} from "@/utils/stripe/invoice-refund";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const started = Date.now();
  const { requestId } = requestContext(request);
  const { id: invoiceId } = await params;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Refunds are temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    requireTestModeDirectCharges(stripeSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test mode is required." },
      { status: 409 },
    );
  }

  let requestedAmount: unknown;
  try {
    const body = (await request.json()) as { amount?: unknown };
    requestedAmount = body.amount;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: invoiceRow } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoiceRow) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  const invoice = invoiceRow as Invoice;

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", invoice.project_id)
    .maybeSingle();
  const project = projectRow as Project | null;
  if (!project || project.freelancer_id !== user.id) {
    return NextResponse.json(
      { error: "Only the workspace owner can refund this invoice." },
      { status: 403 },
    );
  }

  if (!canRequestInvoiceRefund(invoice)) {
    return NextResponse.json(
      { error: "This invoice does not have a refundable completed payment." },
      { status: 409 },
    );
  }

  const refundableAmount = refundableInvoiceAmount(invoice);
  const validation = validateInvoiceRefundAmount(
    requestedAmount,
    refundableAmount,
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const connectedAccountId = invoice.stripe_connected_account_id!;
  const chargeId = invoice.stripe_charge_id!;
  const requestedAt = new Date().toISOString();
  const previousStatus = invoice.status;
  const admin = createAdminClient();

  // Claim the invoice before calling Stripe. This prevents two different
  // refund requests from being initiated concurrently for the same payment.
  const { data: claimed, error: claimError } = await admin
    .from("invoices")
    .update({
      status: "refund_pending",
      refund_pending_amount: validation.amount,
      refund_requested_at: requestedAt,
      payment_status_updated_at: requestedAt,
    })
    .eq("id", invoice.id)
    .eq("amount_refunded", invoice.amount_refunded)
    .in("status", ["paid", "partially_refunded"])
    .select("id")
    .maybeSingle();

  if (claimError || !claimed) {
    return NextResponse.json(
      { error: "A refund is already in progress. Refresh and try again." },
      { status: 409 },
    );
  }

  const stripe = new Stripe(stripeSecret);
  try {
    const refund = await stripe.refunds.create(
      {
        charge: chargeId,
        amount: validation.amount,
        metadata: {
          invoice_id: invoice.id,
          project_id: invoice.project_id,
          freelancer_id: user.id,
          connected_account_id: connectedAccountId,
          initiated_by: "portal_owner",
        },
      },
      connectedAccountRequestOptions(
        connectedAccountId,
        invoiceRefundIdempotencyKey({
          invoiceId: invoice.id,
          connectedAccountId,
          chargeId,
          amountRefunded: invoice.amount_refunded,
          requestedAmount: validation.amount,
        }),
      ),
    );

    if (refund.status === "failed") {
      throw new Error(refund.failure_reason ?? "Stripe could not create the refund.");
    }

    const { error: persistError } = await admin
      .from("invoices")
      .update({ stripe_refund_id: refund.id })
      .eq("id", invoice.id)
      .eq("status", "refund_pending");
    if (persistError) {
      logEvent("error", "invoice_refund_persistence_failed", {
        requestId,
        invoiceId: invoice.id,
        refundId: refund.id,
        connectedAccountId,
        message: persistError.message,
      });
      return NextResponse.json(
        { error: "Refund started, but Portal could not save its status. Stripe will retry the update." },
        { status: 500 },
      );
    }

    const { error: historyError } = await admin
      .from("invoice_payment_events")
      .insert({
        invoice_id: invoice.id,
        stripe_event_id: `portal_refund_request_${refund.id}`,
        event_type: "portal.refund.requested",
        stripe_object_id: refund.id,
        outcome: "refund_pending",
        invoice_status: "refund_pending",
        amount_paid: invoice.amount_paid,
        amount_refunded: invoice.amount_refunded,
        stripe_charge_id: chargeId,
        stripe_dispute_id: null,
        stripe_connected_account_id: connectedAccountId,
        failure_code: null,
        failure_message: null,
        occurred_at: requestedAt,
        metadata: { requested_amount: validation.amount },
      });
    if (historyError && historyError.code !== "23505") {
      logEvent("error", "invoice_refund_history_failed", {
        requestId,
        invoiceId: invoice.id,
        refundId: refund.id,
        message: historyError.message,
      });
    }

    try {
      const { processNotificationOutbox } = await import("@/lib/notifications/processor");
      await processNotificationOutbox({ maxEvents: 10, maxDeliveries: 10 });
    } catch (notificationError) {
      logEvent("error", "invoice_refund_notification_failed", {
        requestId,
        invoiceId: invoice.id,
        message: notificationError instanceof Error ? notificationError.message : String(notificationError),
      });
    }

    logEvent("info", "invoice_refund_started", {
      requestId,
      invoiceId: invoice.id,
      refundId: refund.id,
      connectedAccountId,
      amount: validation.amount,
      durationMs: Date.now() - started,
    });
    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      amount: validation.amount,
      status: "refund_pending",
    });
  } catch (error) {
    await admin
      .from("invoices")
      .update({
        status: previousStatus,
        refund_pending_amount: 0,
        refund_requested_at: null,
        payment_status_updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id)
      .eq("status", "refund_pending")
      .is("stripe_refund_id", null);

    logEvent("error", "invoice_refund_failed", {
      requestId,
      invoiceId: invoice.id,
      connectedAccountId,
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start refund." },
      { status: 502 },
    );
  }
}
