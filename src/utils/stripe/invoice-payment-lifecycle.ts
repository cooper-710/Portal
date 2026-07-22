import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import type {
  Database,
  Invoice,
  InvoiceDisputeStatus,
  InvoiceStatus,
} from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  connectedAccountRequestOptions,
  paymentAccountMatches,
} from "@/utils/stripe/direct-charge";

export type InvoicePaymentOutcome =
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "partially_refunded"
  | "refunded"
  | "refund_failed"
  | "dispute_opened"
  | "dispute_won"
  | "dispute_lost";

export type NormalizedInvoicePaymentEvent = {
  stripeEventId: string;
  stripeEventType: string;
  stripeObjectId: string | null;
  invoiceId: string;
  outcome: InvoicePaymentOutcome;
  connectedAccountId: string | null;
  occurredAt: number;
  amountPaid?: number;
  amountRefunded?: number;
  chargeId?: string | null;
  refundId?: string | null;
  disputeId?: string | null;
  paymentIntentId?: string | null;
  checkoutSessionId?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
};

type PaymentState = Pick<
  Invoice,
  | "status"
  | "amount_paid"
  | "amount_refunded"
  | "refund_pending_amount"
  | "stripe_charge_id"
  | "stripe_refund_id"
  | "stripe_dispute_id"
  | "dispute_status"
  | "refund_requested_at"
  | "refund_completed_at"
  | "stripe_payment_intent_id"
  | "stripe_checkout_session_id"
  | "stripe_connected_account_id"
  | "last_payment_event_created_at"
>;

export function reduceInvoicePaymentState(
  current: PaymentState,
  event: NormalizedInvoicePaymentEvent,
): PaymentState & { payment_status_updated_at: string } {
  if (
    current.last_payment_event_created_at != null &&
    event.occurredAt < current.last_payment_event_created_at
  ) {
    return {
      ...current,
      payment_status_updated_at: new Date(
        current.last_payment_event_created_at * 1000,
      ).toISOString(),
    };
  }

  const amountPaid = event.amountPaid ?? current.amount_paid;
  const amountRefunded = event.amountRefunded ?? current.amount_refunded;
  let status: InvoiceStatus = current.status;
  let disputeStatus: InvoiceDisputeStatus | null = current.dispute_status;

  switch (event.outcome) {
    case "processing":
      status = "processing";
      break;
    case "succeeded":
      status = amountRefunded >= amountPaid && amountPaid > 0
        ? "refunded"
        : amountRefunded > 0
          ? "partially_refunded"
          : "paid";
      break;
    case "failed":
      status = "pending";
      break;
    case "canceled":
      status = "canceled";
      break;
    case "partially_refunded":
      status = "partially_refunded";
      break;
    case "refunded":
      status = "refunded";
      break;
    case "refund_failed":
      status = amountRefunded >= amountPaid && amountPaid > 0
        ? "refunded"
        : amountRefunded > 0
          ? "partially_refunded"
          : "paid";
      break;
    case "dispute_opened":
      status = "disputed";
      disputeStatus = "open";
      break;
    case "dispute_won":
      status = amountRefunded >= amountPaid && amountPaid > 0
        ? "refunded"
        : amountRefunded > 0
          ? "partially_refunded"
          : "paid";
      disputeStatus = "won";
      break;
    case "dispute_lost":
      status = "disputed";
      disputeStatus = "lost";
      break;
  }

  const refundCompleted =
    event.outcome === "partially_refunded" || event.outcome === "refunded";
  const refundResolved = refundCompleted || event.outcome === "refund_failed";

  return {
    status,
    amount_paid: amountPaid,
    amount_refunded: amountRefunded,
    refund_pending_amount: refundResolved ? 0 : current.refund_pending_amount,
    stripe_charge_id: event.chargeId ?? current.stripe_charge_id,
    stripe_refund_id: event.refundId ?? current.stripe_refund_id,
    stripe_dispute_id: event.disputeId ?? current.stripe_dispute_id,
    dispute_status: disputeStatus,
    refund_requested_at:
      event.outcome === "refund_failed" ? null : current.refund_requested_at,
    refund_completed_at: refundCompleted
      ? new Date(event.occurredAt * 1000).toISOString()
      : current.refund_completed_at,
    stripe_payment_intent_id:
      event.paymentIntentId ?? current.stripe_payment_intent_id,
    stripe_checkout_session_id:
      event.checkoutSessionId ?? current.stripe_checkout_session_id,
    stripe_connected_account_id: current.stripe_connected_account_id,
    last_payment_event_created_at: event.occurredAt,
    payment_status_updated_at: new Date(event.occurredAt * 1000).toISOString(),
  };
}

export function invoiceCheckoutIdempotencyKey(
  invoice: Pick<Invoice, "id" | "updated_at">,
  connectedAccountId: string,
) {
  return `portal:invoice-checkout:${connectedAccountId}:${invoice.id}:${Date.parse(invoice.updated_at)}`;
}

async function findInvoiceId(
  admin: SupabaseClient<Database>,
  references: {
    invoiceId?: string | null;
    paymentIntentId?: string | null;
    chargeId?: string | null;
    checkoutSessionId?: string | null;
  },
) {
  if (references.invoiceId) return references.invoiceId;
  for (const [column, value] of [
    ["stripe_payment_intent_id", references.paymentIntentId],
    ["stripe_charge_id", references.chargeId],
    ["stripe_checkout_session_id", references.checkoutSessionId],
  ] as const) {
    if (!value) continue;
    const { data, error } = await admin
      .from("invoices")
      .select("id")
      .eq(column, value)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data.id;
  }
  return null;
}

export async function applyInvoicePaymentEvent(
  event: NormalizedInvoicePaymentEvent,
  admin = createAdminClient(),
) {
  const { data, error } = await admin
    .from("invoices")
    .select("*")
    .eq("id", event.invoiceId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Invoice not found." };
  }

  const invoice = data as Invoice;
  if (
    !paymentAccountMatches(
      invoice.stripe_connected_account_id,
      event.connectedAccountId,
    )
  ) {
    return {
      ok: false as const,
      error: "Stripe event connected account does not match the invoice owner.",
    };
  }

  const { error: historyError } = await admin.from("invoice_payment_events").insert({
    invoice_id: event.invoiceId,
    stripe_event_id: event.stripeEventId,
    event_type: event.stripeEventType,
    stripe_object_id: event.stripeObjectId,
    outcome: event.outcome,
    invoice_status: null,
    amount_paid: event.amountPaid ?? null,
    amount_refunded: event.amountRefunded ?? null,
    stripe_charge_id: event.chargeId ?? null,
    stripe_dispute_id: event.disputeId ?? null,
    stripe_connected_account_id: event.connectedAccountId,
    failure_code: event.failureCode ?? null,
    failure_message: event.failureMessage ?? null,
    occurred_at: new Date(event.occurredAt * 1000).toISOString(),
    metadata: {},
  });
  if (historyError?.code === "23505") {
    return { ok: true as const, invoiceId: event.invoiceId, duplicate: true as const };
  }
  if (historyError) return { ok: false as const, error: historyError.message };

  async function discardHistory() {
    await admin
      .from("invoice_payment_events")
      .delete()
      .eq("stripe_event_id", event.stripeEventId);
  }

  const next = reduceInvoicePaymentState(invoice, event);
  const isOutOfOrder =
    invoice.last_payment_event_created_at != null &&
    event.occurredAt < invoice.last_payment_event_created_at;

  if (!isOutOfOrder) {
    const { error: updateError } = await admin
      .from("invoices")
      .update(next)
      .eq("id", invoice.id)
      .or(
        `last_payment_event_created_at.is.null,last_payment_event_created_at.lte.${event.occurredAt}`,
      );
    if (updateError) {
      await discardHistory();
      return { ok: false as const, error: updateError.message };
    }
  }

  await admin
    .from("invoice_payment_events")
    .update({ invoice_status: isOutOfOrder ? invoice.status : next.status })
    .eq("stripe_event_id", event.stripeEventId);

  if (!isOutOfOrder && event.outcome === "succeeded") {
    const { error: actionError } = await admin
      .from("client_actions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("invoice_id", invoice.id)
      .eq("status", "open");
    if (actionError) {
      console.error(
        `[invoice lifecycle] payment persisted but client action completion failed invoice=${invoice.id}:`,
        actionError.message,
      );
    }
  }

  return { ok: true as const, invoiceId: invoice.id, outOfOrder: isOutOfOrder };
}

function id(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function handleInvoiceStripeEvent(
  stripe: Stripe,
  event: Stripe.Event,
  connectedAccountId: string | null,
) {
  const admin = createAdminClient();
  const occurredAt = event.created;

  if (event.type.startsWith("checkout.session.")) {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = await findInvoiceId(admin, {
      invoiceId: session.metadata?.invoice_id,
      checkoutSessionId: session.id,
      paymentIntentId: id(session.payment_intent),
    });
    if (!invoiceId) return { ok: true as const, ignored: true as const };

    let outcome: InvoicePaymentOutcome;
    if (event.type === "checkout.session.async_payment_failed") outcome = "failed";
    else if (event.type === "checkout.session.expired") outcome = "canceled";
    else if (session.payment_status === "paid") outcome = "succeeded";
    else outcome = "processing";

    const paymentIntentId = id(session.payment_intent);
    let chargeId: string | null = null;
    let amountPaid = session.payment_status === "paid" ? session.amount_total ?? undefined : undefined;
    if (paymentIntentId && outcome === "succeeded") {
      const paymentIntent = connectedAccountId
        ? await stripe.paymentIntents.retrieve(
            paymentIntentId,
            {},
            connectedAccountRequestOptions(connectedAccountId),
          )
        : await stripe.paymentIntents.retrieve(paymentIntentId);
      chargeId = id(paymentIntent.latest_charge);
      amountPaid = paymentIntent.amount_received || session.amount_total || undefined;
    }
    return applyInvoicePaymentEvent({
      stripeEventId: event.id,
      stripeEventType: event.type,
      stripeObjectId: session.id,
      invoiceId,
      outcome,
      connectedAccountId,
      occurredAt,
      amountPaid,
      chargeId,
      paymentIntentId,
      checkoutSessionId: session.id,
    }, admin);
  }

  if (event.type.startsWith("payment_intent.")) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = await findInvoiceId(admin, {
      invoiceId: paymentIntent.metadata.invoice_id,
      paymentIntentId: paymentIntent.id,
      chargeId: id(paymentIntent.latest_charge),
    });
    if (!invoiceId) return { ok: true as const, ignored: true as const };
    const outcome: InvoicePaymentOutcome =
      event.type === "payment_intent.succeeded"
        ? "succeeded"
        : event.type === "payment_intent.canceled"
          ? "canceled"
          : "failed";
    return applyInvoicePaymentEvent({
      stripeEventId: event.id,
      stripeEventType: event.type,
      stripeObjectId: paymentIntent.id,
      invoiceId,
      outcome,
      connectedAccountId,
      occurredAt,
      amountPaid: outcome === "succeeded" ? paymentIntent.amount_received : undefined,
      chargeId: id(paymentIntent.latest_charge),
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code ?? null,
      failureMessage: paymentIntent.last_payment_error?.message ?? null,
    }, admin);
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = id(charge.payment_intent);
    const invoiceId = await findInvoiceId(admin, {
      invoiceId: charge.metadata.invoice_id,
      paymentIntentId,
      chargeId: charge.id,
    });
    if (!invoiceId) return { ok: true as const, ignored: true as const };
    return applyInvoicePaymentEvent({
      stripeEventId: event.id,
      stripeEventType: event.type,
      stripeObjectId: charge.id,
      invoiceId,
      outcome: charge.amount_refunded >= charge.amount ? "refunded" : "partially_refunded",
      connectedAccountId,
      occurredAt,
      amountPaid: charge.amount,
      amountRefunded: charge.amount_refunded,
      chargeId: charge.id,
      refundId: charge.refunds?.data[0]?.id ?? null,
      paymentIntentId,
    }, admin);
  }

  if (event.type === "refund.failed") {
    const refund = event.data.object as Stripe.Refund;
    const chargeId = id(refund.charge);
    const invoiceId = await findInvoiceId(admin, {
      invoiceId: refund.metadata?.invoice_id,
      chargeId,
    });
    if (!invoiceId) return { ok: true as const, ignored: true as const };
    return applyInvoicePaymentEvent({
      stripeEventId: event.id,
      stripeEventType: event.type,
      stripeObjectId: refund.id,
      invoiceId,
      outcome: "refund_failed",
      connectedAccountId,
      occurredAt,
      chargeId,
      refundId: refund.id,
      failureCode: refund.failure_reason ?? null,
      failureMessage: refund.failure_reason
        ? `Stripe refund failed: ${refund.failure_reason}.`
        : "Stripe refund failed.",
    }, admin);
  }

  if (event.type.startsWith("charge.dispute.")) {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = id(dispute.charge);
    const paymentIntentId = id(dispute.payment_intent);
    const invoiceId = await findInvoiceId(admin, { chargeId, paymentIntentId });
    if (!invoiceId) return { ok: true as const, ignored: true as const };
    const outcome: InvoicePaymentOutcome =
      event.type === "charge.dispute.closed"
        ? dispute.status === "won"
          ? "dispute_won"
          : "dispute_lost"
        : "dispute_opened";
    return applyInvoicePaymentEvent({
      stripeEventId: event.id,
      stripeEventType: event.type,
      stripeObjectId: dispute.id,
      invoiceId,
      outcome,
      connectedAccountId,
      occurredAt,
      chargeId,
      disputeId: dispute.id,
      paymentIntentId,
    }, admin);
  }

  return { ok: true as const, ignored: true as const };
}
