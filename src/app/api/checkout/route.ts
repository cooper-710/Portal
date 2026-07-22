import { NextResponse } from "next/server";
import Stripe from "stripe";

import type { Invoice, Project, Profile } from "@/types/database";
import { logEvent, requestContext } from "@/lib/monitoring";
import { calculatePlatformApplicationFeeCents } from "@/utils/stripe/application-fee";
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

  if (!stripeSecret.startsWith("sk_test_") && !stripeSecret.startsWith("sk_live_")) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY looks invalid. Expected sk_test_... or sk_live_..." },
      { status: 503 },
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

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice is already paid." }, { status: 400 });
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

  if (
    !freelancer?.stripe_account_id ||
    !freelancer.stripe_charges_enabled
  ) {
    return NextResponse.json(
      {
        error:
          "This workspace has not finished connecting Stripe payouts yet. Ask the owner to complete Stripe Connect from their Invoices page.",
      },
      { status: 400 },
    );
  }

  const applicationFeeAmount = calculatePlatformApplicationFeeCents(invoice.amount);

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (invoice.currency || "usd").toLowerCase(),
            unit_amount: invoice.amount,
            product_data: {
              name: `Invoice, ${project.title}`,
              description: `Portal invoice ${invoice.id.slice(0, 8)}`,
            },
          },
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        project_id: project.id,
        client_id: user.id,
        freelancer_id: project.freelancer_id,
        application_fee_amount: String(applicationFeeAmount),
      },
      payment_intent_data: {
        // Stripe requires a positive integer; omit when fee rounds/caps to 0.
        ...(applicationFeeAmount > 0
          ? { application_fee_amount: applicationFeeAmount }
          : {}),
        transfer_data: {
          destination: freelancer.stripe_account_id,
        },
        metadata: {
          invoice_id: invoice.id,
          project_id: project.id,
          freelancer_id: project.freelancer_id,
          application_fee_amount: String(applicationFeeAmount),
        },
      },
      success_url: `${appUrl}/dashboard/invoices?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/invoices?canceled=1`,
    });

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await supabase
      .from("invoices")
      .update({
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", invoice.id);

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
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
