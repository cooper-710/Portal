import { NextResponse } from "next/server";
import Stripe from "stripe";

import type { Invoice, Project, Profile } from "@/types/database";
import { logEvent, requestContext } from "@/lib/monitoring";
import { calculatePlatformApplicationFeeCents } from "@/utils/stripe/application-fee";
import {
  buildDirectChargeCheckoutSession,
  connectedAccountRequestOptions,
  directChargeReadiness,
  requireTestModeDirectCharges,
} from "@/utils/stripe/direct-charge";
import { invoiceCheckoutIdempotencyKey } from "@/utils/stripe/invoice-payment-lifecycle";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const started = Date.now();
  const { requestId } = requestContext(request);
  logEvent("info", "invoice_checkout_started", { requestId });
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (!stripeSecret) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured. Add STRIPE_SECRET_KEY (sk_test_...) to .env.local and restart the server.",
      },
      { status: 503 },
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Payment processing is temporarily unavailable." },
      { status: 503 },
    );
  }

  if (!stripeSecret.startsWith("sk_test_") && !stripeSecret.startsWith("sk_live_")) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY looks invalid. Expected sk_test_... or sk_live_..." },
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

  let invoiceId: string | undefined;
  try {
    const body = (await request.json()) as { invoiceId?: string };
    invoiceId = body.invoiceId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: invoiceRow, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoiceRow) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const invoice = invoiceRow as Invoice;

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", invoice.project_id)
    .single();

  if (projectError || !projectRow) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const project = projectRow as Project;

  if (project.client_id !== user.id) {
    return NextResponse.json(
      { error: "Only the assigned client can pay this invoice." },
      { status: 403 },
    );
  }

  if (!["pending", "canceled"].includes(invoice.status)) {
    return NextResponse.json(
      { error: `Invoice cannot be paid while its status is ${invoice.status}.` },
      { status: 400 },
    );
  }

  const { data: freelancerRow } = await supabase
    .from("users")
    .select(
      "id, stripe_account_id, stripe_charges_enabled, email, role",
    )
    .eq("id", project.freelancer_id)
    .maybeSingle();

  const freelancer = freelancerRow as Pick<
    Profile,
    "id" | "stripe_account_id" | "stripe_charges_enabled" | "email" | "role"
  > | null;

  if (!freelancer?.stripe_account_id) {
    return NextResponse.json(
      {
        error:
          "This workspace has not connected a Stripe payment account yet. Ask the owner to complete Stripe Connect from their Invoices page.",
      },
      { status: 400 },
    );
  }

  const applicationFeeAmount = calculatePlatformApplicationFeeCents(invoice.amount);

  const stripe = new Stripe(stripeSecret);

  try {
    const connectedAccountId = freelancer.stripe_account_id;
    const connectedAccount = await stripe.accounts.retrieve(connectedAccountId);
    const readiness = directChargeReadiness(connectedAccount);
    if (!readiness.ready) {
      return NextResponse.json(
        {
          error:
            readiness.reason ??
            "This workspace must finish Stripe payment onboarding before accepting invoices.",
          requiresOnboarding: readiness.requiresOnboarding,
        },
        { status: 409 },
      );
    }

    const idempotencyKey = invoiceCheckoutIdempotencyKey(
      invoice,
      connectedAccountId,
    );
    const session = await stripe.checkout.sessions.create(
      buildDirectChargeCheckoutSession({
        invoiceId: invoice.id,
        projectId: project.id,
        projectTitle: project.title,
        clientId: user.id,
        freelancerId: project.freelancer_id,
        clientEmail: user.email ?? undefined,
        connectedAccountId,
        amount: invoice.amount,
        currency: invoice.currency || "usd",
        applicationFeeAmount,
        appUrl,
      }),
      connectedAccountRequestOptions(connectedAccountId, idempotencyKey),
    );

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    if (!session.url) {
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(
          session.id,
          {},
          connectedAccountRequestOptions(connectedAccountId),
        );
      }
      throw new Error("Stripe did not return a checkout URL.");
    }

    const admin = createAdminClient();
    const checkoutCreatedAt = session.created || Math.floor(Date.now() / 1000);
    const { data: persistedInvoice, error: persistenceError } = await admin
      .from("invoices")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        stripe_connected_account_id: connectedAccountId,
        status: "processing",
        payment_status_updated_at: new Date(checkoutCreatedAt * 1000).toISOString(),
        last_payment_event_created_at: checkoutCreatedAt,
      })
      .eq("id", invoice.id)
      .select("id")
      .maybeSingle();

    if (persistenceError || !persistedInvoice) {
      try {
        if (session.status === "open") {
          await stripe.checkout.sessions.expire(
            session.id,
            {},
            connectedAccountRequestOptions(connectedAccountId),
          );
        }
      } catch (expireError) {
        console.error("[invoice checkout] failed to expire unpersisted session", expireError);
      }
      throw new Error(
        `Checkout Session persistence failed: ${persistenceError?.message ?? "invoice row was not updated"}`,
      );
    }

    const { error: attemptError } = await admin.from("invoice_payment_events").insert({
      invoice_id: invoice.id,
      stripe_event_id: `portal:checkout-created:${session.id}`,
      event_type: "portal.checkout.created",
      stripe_object_id: session.id,
      outcome: "processing",
      invoice_status: "processing",
      amount_paid: 0,
      amount_refunded: 0,
      stripe_charge_id: null,
      stripe_dispute_id: null,
      stripe_connected_account_id: connectedAccountId,
      failure_code: null,
      failure_message: null,
      occurred_at: new Date(checkoutCreatedAt * 1000).toISOString(),
      metadata: { idempotency_key: idempotencyKey, charge_model: "direct" },
    });
    if (attemptError && attemptError.code !== "23505") {
      try {
        if (session.status === "open") {
          await stripe.checkout.sessions.expire(
            session.id,
            {},
            connectedAccountRequestOptions(connectedAccountId),
          );
        }
      } finally {
        await admin
          .from("invoices")
          .update({
            status: "pending",
            stripe_checkout_session_id: null,
            stripe_payment_intent_id: null,
            stripe_connected_account_id: null,
            payment_status_updated_at: null,
            last_payment_event_created_at: null,
          })
          .eq("id", invoice.id)
          .eq("stripe_checkout_session_id", session.id);
      }
      throw new Error(`Checkout attempt persistence failed: ${attemptError.message}`);
    }

    logEvent("info", "invoice_checkout_created", {
      requestId,
      invoiceId: invoice.id,
      sessionId: session.id,
      durationMs: Date.now() - started,
    });
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      applicationFeeAmount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start checkout.";
    logEvent("error", "invoice_checkout_failed", {
      requestId,
      message,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      {
        error:
          "Unable to start checkout right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
