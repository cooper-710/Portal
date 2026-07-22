import {
  pickNextRequiredAction,
  type ClientActionWithLinks,
} from "@/lib/client-action-helpers";
import { formatMoney } from "@/lib/format";
import type {
  ClientActionType,
  PaymentKind,
} from "@/types/database";
import type { createClient } from "@/utils/supabase/server";

export type { ClientActionWithLinks };
export { pickNextRequiredAction };

type Supabase = Awaited<ReturnType<typeof createClient>>;

type ProjectContext = {
  id: string;
  title: string;
  freelancer_id: string;
  client_id: string | null;
};

function paymentKindLabel(kind: PaymentKind) {
  switch (kind) {
    case "deposit":
      return "Deposit";
    case "installment":
      return "Payment plan";
    case "retainer":
    case "recurring":
      return "Recurring";
    case "standalone":
    case "standard":
    default:
      return "One-off";
  }
}

/**
 * Upsert an open client action. No-ops when the project has no linked client.
 * Uses unique partial indexes for open invoice/asset/project-review actions.
 */
export async function upsertClientAction(
  supabase: Supabase,
  input: {
    project: ProjectContext;
    actionType: ClientActionType;
    title: string;
    description?: string | null;
    invoiceId?: string | null;
    assetId?: string | null;
    dueAt?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (!input.project.client_id) {
    return { ok: false as const, skipped: true as const };
  }

  const row = {
    project_id: input.project.id,
    client_id: input.project.client_id,
    freelancer_id: input.project.freelancer_id,
    action_type: input.actionType,
    status: "open" as const,
    title: input.title,
    description: input.description ?? null,
    invoice_id: input.invoiceId ?? null,
    asset_id: input.assetId ?? null,
    due_at: input.dueAt ?? null,
    completed_at: null,
    metadata: input.metadata ?? {},
  };

  // Prefer update existing open action, else insert.
  let existingQuery = supabase
    .from("client_actions")
    .select("id")
    .eq("status", "open")
    .eq("action_type", input.actionType)
    .eq("project_id", input.project.id);

  if (input.invoiceId) {
    existingQuery = existingQuery.eq("invoice_id", input.invoiceId);
  } else if (input.assetId) {
    existingQuery = existingQuery.eq("asset_id", input.assetId);
  } else if (input.actionType === "review_project") {
    // unique on project_id + action_type for open review_project
  } else {
    return { ok: false as const, skipped: true as const };
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("client_actions")
      .update({
        title: row.title,
        description: row.description,
        due_at: row.due_at,
        metadata: row.metadata,
      })
      .eq("id", existing.id);

    if (error) {
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, id: existing.id as string };
  }

  const { data, error } = await supabase
    .from("client_actions")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, id: data.id as string };
}

export async function createPayInvoiceAction(
  supabase: Supabase,
  input: {
    project: ProjectContext;
    invoiceId: string;
    amount: number;
    currency?: string;
    paymentKind?: PaymentKind;
    dueDate?: string | null;
    title?: string | null;
  },
) {
  const kind = input.paymentKind ?? "standard";
  const label = input.title?.trim() || paymentKindLabel(kind);
  const dueAt = input.dueDate
    ? `${input.dueDate}T12:00:00.000Z`
    : null;

  return upsertClientAction(supabase, {
    project: input.project,
    actionType: "pay_invoice",
    title: `Pay ${label} · ${formatMoney(input.amount, input.currency ?? "usd")}`,
    description: `Payment due for ${input.project.title}`,
    invoiceId: input.invoiceId,
    dueAt,
    metadata: { payment_kind: kind },
  });
}

export async function createReviewDeliverableAction(
  supabase: Supabase,
  input: {
    project: ProjectContext;
    assetId: string;
    fileName?: string | null;
  },
) {
  const name = input.fileName?.trim() || "Deliverable";
  return upsertClientAction(supabase, {
    project: input.project,
    actionType: "review_deliverable",
    title: `Review ${name}`,
    description: `Approve or request changes on a new deliverable for ${input.project.title}`,
    assetId: input.assetId,
  });
}

export async function createReviewProjectAction(
  supabase: Supabase,
  input: { project: ProjectContext },
) {
  return upsertClientAction(supabase, {
    project: input.project,
    actionType: "review_project",
    title: `Review ${input.project.title}`,
    description: "Your project is ready for review.",
  });
}

export async function completeClientActionsForInvoice(
  supabase: Supabase,
  invoiceId: string,
) {
  await supabase
    .from("client_actions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("invoice_id", invoiceId)
    .eq("status", "open");
}

export async function dismissOpenDeliverableActions(
  supabase: Supabase,
  assetId: string,
) {
  await supabase
    .from("client_actions")
    .update({
      status: "dismissed",
      completed_at: new Date().toISOString(),
    })
    .eq("asset_id", assetId)
    .eq("status", "open");
}

export async function completeOpenProjectReviewActions(
  supabase: Supabase,
  projectId: string,
) {
  await supabase
    .from("client_actions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("action_type", "review_project")
    .eq("status", "open");
}
