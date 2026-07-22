"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  isPlatformSubscriptionActive,
  PORTAL_PRO_TRIAL_DAYS,
} from "@/utils/stripe/subscription";
import {
  normalizeFullName,
  validateFullName,
  validatePassword,
} from "@/lib/account-validation";
import { isValidAppearance } from "@/lib/branding";
import {
  completeOpenProjectReviewActions,
  createPayInvoiceAction,
  createReviewDeliverableAction,
  createReviewProjectAction,
  dismissOpenDeliverableActions,
} from "@/lib/client-actions";
import { displayName } from "@/lib/format";
import type { PaymentKind } from "@/types/database";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const PAYMENT_KINDS = new Set<PaymentKind>([
  "standard",
  "deposit",
  "installment",
  "retainer",
  "recurring",
  "standalone",
]);

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Permanently delete the signed-in user's account.
 *
 * Freelancer: cancels Portal Pro subscription (best-effort), removes project
 * storage objects, then deletes auth user — projects/assets/invoices cascade.
 * Client: unlinks from projects (`client_id` SET NULL); does not delete projects.
 */
export async function deleteAccount(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const acknowledged = String(formData.get("acknowledged") ?? "") === "on";

  if (!acknowledged) {
    return {
      error: "Confirm that you understand this cannot be undone.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, email, role, stripe_subscription_id, stripe_account_id, stripe_customer_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return { error: "Profile not found." };
  }

  const email = (user.email ?? profile.email).trim().toLowerCase();
  const confirmationOk =
    confirmation === "DELETE" || confirmation.toLowerCase() === email;

  if (!confirmationOk) {
    return {
      error: "Type DELETE or your account email exactly to confirm.",
    };
  }

  if (profile.role === "freelancer") {
    await cancelFreelancerStripeSubscription(profile.stripe_subscription_id);
    await removeFreelancerProjectAssets(user.id);
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Account deletion is temporarily unavailable. Contact support if this continues.",
    };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return {
      error: deleteError.message || "Could not delete your account.",
    };
  }

  await supabase.auth.signOut();
  redirect("/login");
}

async function cancelFreelancerStripeSubscription(
  subscriptionId: string | null,
) {
  if (!subscriptionId) return;

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) return;

  try {
    const stripe = new Stripe(stripeSecret);
    await stripe.subscriptions.cancel(subscriptionId);
  } catch {
    // Best-effort: still delete the account if Stripe cancel fails.
  }
}

async function removeFreelancerProjectAssets(freelancerId: string) {
  try {
    const admin = createAdminClient();
    const { data: projects } = await admin
      .from("projects")
      .select("id")
      .eq("freelancer_id", freelancerId);

    const projectIds = (projects ?? []).map((project) => project.id);
    if (projectIds.length === 0) return;

    const { data: assets } = await admin
      .from("assets")
      .select("file_url")
      .in("project_id", projectIds);

    const paths = (assets ?? [])
      .map((asset) => asset.file_url)
      .filter((path): path is string => Boolean(path));

    if (paths.length === 0) return;

    const chunkSize = 100;
    for (let i = 0; i < paths.length; i += chunkSize) {
      await admin.storage
        .from("project-assets")
        .remove(paths.slice(i, i + chunkSize));
    }
  } catch {
    // Best-effort: DB rows still cascade; orphaned storage is acceptable.
  }
}

async function requireSubscribedFreelancer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." as const };
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "role, email, full_name, subscription_status, business_name, logo_url, brand_primary",
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return { error: "Only freelancers can do that." as const };
  }

  if (!isPlatformSubscriptionActive(profile.subscription_status)) {
    return {
      error:
        `Start a ${PORTAL_PRO_TRIAL_DAYS}-day free trial of Portal Pro (then $25/mo) to create projects, invoices, and uploads. Open Billing to begin.` as const,
    };
  }

  return { supabase, user, profile };
}

export async function setAccountPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const fullName = normalizeFullName(formData.get("fullName"));

  const nameError = validateFullName(fullName);
  if (nameError) {
    return { error: nameError };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to set a password." };
  }

  // Stores the password in Supabase Auth (auth.users) — never in public tables.
  const { error: updateError } = await supabase.auth.updateUser({
    password,
    data: { full_name: fullName },
  });

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ password_set: true, full_name: fullName })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  return { success: true as const };
}

export async function updateAccountName(formData: FormData) {
  const fullName = normalizeFullName(formData.get("fullName"));
  const nameError = validateFullName(fullName);
  if (nameError) {
    return { error: nameError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/invoices");
  return { success: true as const };
}

export async function updateBusinessBranding(formData: FormData) {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const brandPrimary = String(formData.get("brandPrimary") ?? "").trim();
  const brandAccent = String(formData.get("brandAccent") ?? "").trim();
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim();
  const appearanceRaw = String(formData.get("appearance") ?? "light").trim();
  const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
  const logoFile = formData.get("logo");

  if (businessName.length > 80) {
    return { error: "Business name must be 80 characters or fewer." };
  }
  if (welcomeMessage.length > 280) {
    return { error: "Welcome message must be 280 characters or fewer." };
  }
  if (brandPrimary && !HEX_RE.test(brandPrimary)) {
    return { error: "Primary color must be a hex value like #2563eb." };
  }
  if (brandAccent && !HEX_RE.test(brandAccent)) {
    return { error: "Accent color must be a hex value like #0ea5e9." };
  }
  if (!isValidAppearance(appearanceRaw)) {
    return { error: "Choose a valid appearance." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, logo_url")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return { error: "Only freelancers can edit client portal branding." };
  }

  let logoUrl: string | null | undefined = undefined;

  if (removeLogo) {
    if (profile.logo_url) {
      await supabase.storage.from("business-logos").remove([profile.logo_url]);
    }
    logoUrl = null;
  }

  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) {
      return { error: "Logo must be 2 MB or smaller." };
    }
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ]);
    if (!allowed.has(logoFile.type)) {
      return { error: "Logo must be PNG, JPG, WebP, GIF, or SVG." };
    }
    const ext =
      logoFile.type === "image/png"
        ? "png"
        : logoFile.type === "image/webp"
          ? "webp"
          : logoFile.type === "image/gif"
            ? "gif"
            : logoFile.type === "image/svg+xml"
              ? "svg"
              : "jpg";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await logoFile.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, bytes, {
        cacheControl: "3600",
        upsert: true,
        contentType: logoFile.type,
      });
    if (uploadError) {
      return {
        error:
          "Could not upload logo. Try a smaller PNG or JPG, or skip the logo for now.",
      };
    }
    if (profile.logo_url && profile.logo_url !== path) {
      await supabase.storage.from("business-logos").remove([profile.logo_url]);
    }
    logoUrl = path;
  }

  const updatePayload: {
    business_name: string | null;
    brand_primary: string | null;
    brand_accent: string | null;
    welcome_message: string | null;
    appearance: "light" | "default";
    logo_url?: string | null;
    portal_setup_completed_at?: string;
  } = {
    business_name: businessName || null,
    brand_primary: brandPrimary || null,
    brand_accent: brandAccent || null,
    welcome_message: welcomeMessage || null,
    appearance: appearanceRaw,
  };
  if (logoUrl !== undefined) {
    updatePayload.logo_url = logoUrl;
  }
  // Mark one-time customize step done when saving from onboarding or settings.
  updatePayload.portal_setup_completed_at = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  revalidatePath("/onboarding/portal");
  return { success: true as const };
}

/** One-click skip for customize-portal onboarding (no branding required). */
export async function completePortalSetup() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "freelancer") {
    return { error: "Only freelancers can complete portal setup." };
  }

  const { error } = await supabase
    .from("users")
    .update({ portal_setup_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding/portal");
  return { success: true as const };
}

export async function reviewDeliverable(formData: FormData) {
  const actionId = String(formData.get("actionId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!actionId || (decision !== "approved" && decision !== "changes_requested")) {
    return { error: "Choose approve or request changes." };
  }
  if (decision === "changes_requested" && note.length > 1000) {
    return { error: "Note must be 1000 characters or fewer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: action } = await supabase
    .from("client_actions")
    .select("*")
    .eq("id", actionId)
    .eq("client_id", user.id)
    .eq("action_type", "review_deliverable")
    .eq("status", "open")
    .maybeSingle();

  if (!action || !action.asset_id) {
    return { error: "Review action not found." };
  }

  const { error: assetError } = await supabase
    .from("assets")
    .update({
      review_status: decision,
      review_note: decision === "changes_requested" ? note || null : null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", action.asset_id);

  if (assetError) {
    return { error: assetError.message };
  }

  const { error: actionError } = await supabase
    .from("client_actions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      metadata: {
        ...(typeof action.metadata === "object" && action.metadata
          ? action.metadata
          : {}),
        decision,
        review_note: note || null,
      },
    })
    .eq("id", action.id);

  if (actionError) {
    return { error: actionError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${action.project_id}`);
  return { success: true as const };
}

export async function updateAccountPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ password_set: true })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true as const };
}

export async function createProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!title) {
    return { error: "Project title is required." };
  }

  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { error: "Enter a valid client email, or leave it blank." };
  }

  const auth = await requireSubscribedFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user, profile } = auth;

  let clientId: string | null = null;
  let existingClient = false;

  if (clientEmail) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", clientEmail)
      .maybeSingle();

    if (existing) {
      clientId = existing.id;
      existingClient = true;
    }
  }

  const { error } = await supabase.from("projects").insert({
    title,
    freelancer_id: user.id,
    client_id: clientId,
    client_email: clientEmail || null,
    status: "discovery",
  });

  if (error) {
    return { error: error.message };
  }

  let inviteSent = false;
  if (clientEmail) {
    const { sendProjectInvite } = await import("@/utils/email/send-project-invite");
    const invite = await sendProjectInvite({
      to: clientEmail,
      projectTitle: title,
      freelancerName:
        displayName(profile, user.email ?? "") || "your freelancer",
      existingClient,
      businessName: profile.business_name,
      logoUrl: profile.logo_url,
      brandPrimary: profile.brand_primary,
    });
    inviteSent = invite.sent;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  return { success: true as const, inviteSent };
}

export async function updateProjectClientEmail(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!projectId) {
    return { error: "Project is required." };
  }

  if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { error: "Enter a valid client email, or leave it blank." };
  }

  const auth = await requireSubscribedFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user, profile } = auth;

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (!projectRow) {
    return { error: "Project not found." };
  }

  const previousEmail = (projectRow.client_email ?? "").toLowerCase();
  const nextEmail = clientEmail || null;

  let clientId: string | null = null;
  let existingClient = false;

  if (nextEmail) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", nextEmail)
      .maybeSingle();

    if (existing) {
      clientId = existing.id;
      existingClient = true;
    }
  }

  const { error } = await supabase
    .from("projects")
    .update({
      client_email: nextEmail,
      client_id: clientId,
    })
    .eq("id", projectId)
    .eq("freelancer_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const emailChanged = previousEmail !== (nextEmail ?? "");
  let inviteSent = false;

  if (nextEmail && emailChanged) {
    const { sendProjectInvite } = await import("@/utils/email/send-project-invite");
    const invite = await sendProjectInvite({
      to: nextEmail,
      projectTitle: projectRow.title,
      freelancerName:
        displayName(profile, user.email ?? "") || "your freelancer",
      existingClient,
      businessName: profile.business_name,
      logoUrl: profile.logo_url,
      brandPrimary: profile.brand_primary,
    });
    inviteSent = invite.sent;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true as const, inviteSent, emailChanged };
}

function addMonthsIso(dateIso: string, months: number) {
  const date = new Date(`${dateIso}T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export async function createInvoice(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const amountDollars = Number(formData.get("amount"));
  const paymentKindRaw = String(formData.get("paymentKind") ?? "standard").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const installmentCount = Number(formData.get("installmentCount") ?? "1");
  const seriesCount = Number(formData.get("seriesCount") ?? "1");

  if (!projectId || !Number.isFinite(amountDollars) || amountDollars <= 0) {
    return { error: "Enter a valid project and amount." };
  }

  const paymentKind = (
    PAYMENT_KINDS.has(paymentKindRaw as PaymentKind)
      ? paymentKindRaw
      : "standard"
  ) as PaymentKind;

  const dueDate =
    dueDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw) ? dueDateRaw : null;

  const amount = Math.round(amountDollars * 100);
  const auth = await requireSubscribedFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, freelancer_id, client_id")
    .eq("id", projectId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found in your workspace." };
  }

  const projectCtx = {
    id: project.id,
    title: project.title,
    freelancer_id: project.freelancer_id,
    client_id: project.client_id,
  };

  // Recurring / retainer MVP: create a dated series of discrete invoices.
  if (
    (paymentKind === "recurring" || paymentKind === "retainer") &&
    Number.isFinite(seriesCount) &&
    seriesCount > 1
  ) {
    if (!dueDate) {
      return {
        error: "Pick a first due date for recurring or retainer payments.",
      };
    }
    if (seriesCount > 24) {
      return { error: "Series can include at most 24 payments." };
    }

    const seriesKey = crypto.randomUUID();
    const rows = Array.from({ length: seriesCount }, (_, index) => ({
      project_id: projectId,
      amount,
      status: "pending" as const,
      payment_kind: paymentKind,
      due_date: addMonthsIso(dueDate, index),
      installment_number: index + 1,
      title:
        title ||
        `${paymentKind === "retainer" ? "Retainer" : "Recurring"} ${index + 1}/${seriesCount}`,
      series_key: seriesKey,
    }));

    const { data: created, error } = await supabase
      .from("invoices")
      .insert(rows)
      .select("id, amount, currency, payment_kind, due_date, title");

    if (error) {
      return { error: error.message };
    }

    for (const invoice of created ?? []) {
      await createPayInvoiceAction(supabase, {
        project: projectCtx,
        invoiceId: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        paymentKind: invoice.payment_kind,
        dueDate: invoice.due_date,
        title: invoice.title,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true as const, createdCount: created?.length ?? 0 };
  }

  // Installments: split total into N equal dated invoices.
  if (
    paymentKind === "installment" &&
    Number.isFinite(installmentCount) &&
    installmentCount > 1
  ) {
    if (!dueDate) {
      return { error: "Pick a first due date for installments." };
    }
    if (installmentCount > 12) {
      return { error: "Installments can include at most 12 payments." };
    }

    const base = Math.floor(amount / installmentCount);
    const remainder = amount - base * installmentCount;
    const seriesKey = crypto.randomUUID();
    const rows = Array.from({ length: installmentCount }, (_, index) => ({
      project_id: projectId,
      amount: base + (index === 0 ? remainder : 0),
      status: "pending" as const,
      payment_kind: "installment" as const,
      due_date: addMonthsIso(dueDate, index),
      installment_number: index + 1,
      title: title || `Installment ${index + 1}/${installmentCount}`,
      series_key: seriesKey,
    }));

    const { data: created, error } = await supabase
      .from("invoices")
      .insert(rows)
      .select("id, amount, currency, payment_kind, due_date, title");

    if (error) {
      return { error: error.message };
    }

    for (const invoice of created ?? []) {
      await createPayInvoiceAction(supabase, {
        project: projectCtx,
        invoiceId: invoice.id,
        amount: invoice.amount,
        currency: invoice.currency,
        paymentKind: invoice.payment_kind,
        dueDate: invoice.due_date,
        title: invoice.title,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true as const, createdCount: created?.length ?? 0 };
  }

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      project_id: projectId,
      amount,
      status: "pending",
      payment_kind: paymentKind,
      due_date: dueDate,
      title: title || null,
      installment_number: paymentKind === "installment" ? 1 : null,
    })
    .select("id, amount, currency, payment_kind, due_date, title")
    .single();

  if (error || !invoice) {
    return { error: error?.message ?? "Could not create invoice." };
  }

  await createPayInvoiceAction(supabase, {
    project: projectCtx,
    invoiceId: invoice.id,
    amount: invoice.amount,
    currency: invoice.currency,
    paymentKind: invoice.payment_kind,
    dueDate: invoice.due_date,
    title: invoice.title,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true as const };
}

export async function updateProjectPhase(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const allowed = new Set([
    "discovery",
    "in_progress",
    "review",
    "completed",
  ]);

  if (!projectId || !allowed.has(status)) {
    return { error: "Choose a valid project phase." };
  }

  const auth = await requireSubscribedFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, freelancer_id, client_id")
    .eq("id", projectId)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      status: status as
        | "discovery"
        | "in_progress"
        | "review"
        | "completed",
    })
    .eq("id", projectId)
    .eq("freelancer_id", user.id);

  if (error) {
    return { error: error.message };
  }

  if (status === "review") {
    await createReviewProjectAction(supabase, {
      project: {
        id: project.id,
        title: project.title,
        freelancer_id: project.freelancer_id,
        client_id: project.client_id,
      },
    });
  } else {
    await completeOpenProjectReviewActions(supabase, projectId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true as const };
}

export async function uploadAsset(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file");
  const visibilityRaw = String(formData.get("visibility") ?? "internal");

  if (!projectId || !(file instanceof File) || file.size === 0) {
    return { error: "Choose a file and project." };
  }

  if (file.size > 50 * 1024 * 1024) {
    return { error: "File must be 50 MB or smaller." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, freelancer_id, client_id")
    .eq("id", projectId)
    .or(`freelancer_id.eq.${user.id},client_id.eq.${user.id}`)
    .maybeSingle();

  if (!project) {
    return { error: "You do not have access to this project." };
  }

  const isFreelancer = project.freelancer_id === user.id;

  // Uploads are freelancer-only. Clients may only view/download deliverables.
  if (!isFreelancer) {
    return { error: "Only freelancers can upload files to a project." };
  }

  // Freelancer uploads require Portal Pro trial or paid subscription.
  const { data: profile } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!isPlatformSubscriptionActive(profile?.subscription_status)) {
    return {
      error: `Start a ${PORTAL_PRO_TRIAL_DAYS}-day free trial of Portal Pro (then $25/mo) to upload files. Open Billing to begin.`,
    };
  }

  const visibility =
    visibilityRaw === "deliverable" ? "deliverable" : "internal";

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${projectId}/${crypto.randomUUID()}-${safeName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("project-assets")
    .upload(path, bytes, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return {
      error:
        "Could not upload that file. Check the size (50 MB max) and try again.",
    };
  }

  const { data: asset, error: insertError } = await supabase
    .from("assets")
    .insert({
      project_id: projectId,
      file_url: path,
      file_name: file.name,
      visibility,
      uploaded_by: user.id,
      review_status: visibility === "deliverable" ? "pending" : null,
    })
    .select("id, file_name")
    .single();

  if (insertError || !asset) {
    await supabase.storage.from("project-assets").remove([path]);
    return { error: insertError?.message ?? "Could not save file." };
  }

  if (visibility === "deliverable") {
    await createReviewDeliverableAction(supabase, {
      project: {
        id: project.id,
        title: project.title,
        freelancer_id: project.freelancer_id,
        client_id: project.client_id,
      },
      assetId: asset.id,
      fileName: asset.file_name,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true as const };
}

export async function updateAssetVisibility(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();

  if (!assetId || (visibility !== "internal" && visibility !== "deliverable")) {
    return { error: "Choose a valid file visibility." };
  }

  const auth = await requireSubscribedFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: asset } = await supabase
    .from("assets")
    .select("id, project_id, file_name, visibility")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return { error: "Asset not found." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, freelancer_id, client_id")
    .eq("id", asset.project_id)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Only freelancers can change file visibility on their projects." };
  }

  const { error } = await supabase
    .from("assets")
    .update({
      visibility,
      review_status:
        visibility === "deliverable"
          ? "pending"
          : null,
      review_note: visibility === "deliverable" ? null : null,
      reviewed_at: null,
    })
    .eq("id", assetId);

  if (error) {
    return { error: error.message };
  }

  if (visibility === "deliverable") {
    await createReviewDeliverableAction(supabase, {
      project: {
        id: project.id,
        title: project.title,
        freelancer_id: project.freelancer_id,
        client_id: project.client_id,
      },
      assetId: asset.id,
      fileName: asset.file_name,
    });
  } else {
    await dismissOpenDeliverableActions(supabase, asset.id);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${asset.project_id}`);
  return { success: true as const };
}

export async function deleteAsset(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "").trim();

  if (!assetId) {
    return { error: "Choose a file to delete." };
  }

  const auth = await requireSubscribedFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: asset } = await supabase
    .from("assets")
    .select("id, project_id, file_url, file_name")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return { error: "Asset not found." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("freelancer_id")
    .eq("id", asset.project_id)
    .eq("freelancer_id", user.id)
    .maybeSingle();

  if (!project) {
    return { error: "Only freelancers can delete files on their projects." };
  }

  const { error: storageError } = await supabase.storage
    .from("project-assets")
    .remove([asset.file_url]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/projects/${asset.project_id}`);
  return { success: true as const };
}

export async function getAssetDownloadUrl(assetId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  // RLS already hides internal assets from clients; this is a second guard.
  const { data: asset } = await supabase
    .from("assets")
    .select("id, file_url, project_id, visibility")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset) {
    return { error: "Asset not found or you do not have access." };
  }

  const { data: signed, error } = await supabase.storage
    .from("project-assets")
    .createSignedUrl(asset.file_url, 60 * 10);

  if (error || !signed?.signedUrl) {
    return { error: error?.message ?? "Unable to create download link." };
  }

  return { url: signed.signedUrl };
}
