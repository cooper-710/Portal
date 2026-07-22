import { NextResponse } from "next/server";

import { generateInvoicePdf } from "@/lib/invoice-pdf";
import { logEvent, requestContext } from "@/lib/monitoring";
import type { Invoice, Profile, Project } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  const { requestId } = requestContext(request);
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: invoiceRow } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!invoiceRow) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const invoice = invoiceRow as Invoice;

  const { data: projectRow } = await supabase.from("projects").select("*").eq("id", invoice.project_id).maybeSingle();
  if (!projectRow) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  const project = projectRow as Project;
  if (project.freelancer_id !== user.id && project.client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [{ data: ownerRow }, { data: clientRow }] = await Promise.all([
    supabase.from("users").select("*").eq("id", project.freelancer_id).maybeSingle(),
    project.client_id
      ? supabase.from("users").select("id, email, full_name").eq("id", project.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const owner = ownerRow as Profile | null;
  if (!owner) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  try {
    const bytes = await generateInvoicePdf({
      invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
      title: invoice.title?.trim() || "Professional services",
      projectTitle: project.title,
      amountCents: invoice.amount,
      currency: invoice.currency,
      status: invoice.amount_paid > 0 ? "paid" : "pending",
      issuedAt: invoice.created_at,
      dueDate: invoice.due_date,
      businessName: owner.business_name?.trim() || owner.full_name?.trim() || "Portal workspace",
      ownerName: owner.full_name,
      ownerEmail: owner.email,
      clientName: clientRow?.full_name ?? null,
      clientEmail: clientRow?.email ?? project.client_email,
      brandPrimary: owner.brand_primary,
    });

    logEvent("info", "invoice_pdf_generated", {
      requestId,
      invoiceId: invoice.id,
      userId: user.id,
      durationMs: Date.now() - started,
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.id.slice(0, 8)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logEvent("error", "invoice_pdf_failed", {
      requestId,
      invoiceId: invoice.id,
      message: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ error: "Unable to generate invoice PDF." }, { status: 500 });
  }
}
