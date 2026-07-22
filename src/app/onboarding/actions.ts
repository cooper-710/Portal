"use server";

import { revalidatePath } from "next/cache";

import { displayName } from "@/lib/format";
import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  freelancerNeedsOnboarding,
  isOnboardingStep,
  onboardingPath,
  resolveNextStep,
  resolveResumeStep,
  type OnboardingStep,
} from "@/utils/onboarding/steps";
import { createClient } from "@/utils/supabase/server";

async function requireOnboardingFreelancer() {
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
      "role, email, full_name, business_name, logo_url, brand_primary, onboarding_completed_at, onboarding_step, subscription_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "freelancer") {
    return { error: "Only workspace owners can continue onboarding." as const };
  }

  if (!freelancerNeedsOnboarding(profile)) {
    return { error: "Onboarding is already complete." as const, done: true as const };
  }

  return { supabase, user, profile };
}

function revalidateOnboarding() {
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/billing");
}

/**
 * Persist step cursor and return the path for the next screen
 * (after auto-skip rules). Completing `done` sets onboarding_completed_at.
 */
export async function advanceOnboardingStep(fromStep: string) {
  if (!isOnboardingStep(fromStep)) {
    return { error: "Unknown onboarding step." };
  }

  const auth = await requireOnboardingFreelancer();
  if ("error" in auth) {
    if ("done" in auth && auth.done) {
      return { path: "/dashboard" as const };
    }
    return { error: auth.error };
  }

  const { supabase, user } = auth;
  const ctx = await loadOnboardingContext(supabase, user.id);
  if (!ctx) {
    return { error: "Could not load onboarding state." };
  }

  if (fromStep === "done") {
    const { error } = await supabase
      .from("users")
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: "done",
      })
      .eq("id", user.id);

    if (error) {
      return { error: error.message };
    }

    revalidateOnboarding();
    return { path: "/dashboard" as const };
  }

  const next = resolveNextStep(fromStep, ctx);
  const updates: {
    onboarding_step: OnboardingStep;
    onboarding_completed_at?: string;
  } = { onboarding_step: next };

  if (next === "done") {
    // Land on the celebration screen; completion is stamped there or on continue.
    // Persist step so refresh resumes on done.
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user.id);
  if (error) {
    return { error: error.message };
  }

  revalidateOnboarding();
  return { path: onboardingPath(next) };
}

/** Skip current optional step (same as advance). */
export async function skipOnboardingStep(fromStep: string) {
  return advanceOnboardingStep(fromStep);
}

/** Mark wizard finished and enter the real app. */
export async function completeOnboarding() {
  const auth = await requireOnboardingFreelancer();
  if ("error" in auth) {
    if ("done" in auth && auth.done) {
      return { path: "/dashboard" as const };
    }
    return { error: auth.error };
  }

  const { supabase, user } = auth;
  const { error } = await supabase
    .from("users")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: "done",
      // Align legacy flag so settings checklist stays clean.
      portal_setup_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidateOnboarding();
  return { path: "/dashboard" as const };
}

/** Create first project during onboarding (subscription not required yet). */
export async function createOnboardingProject(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return { error: "Project title is required." };
  }
  if (title.length > 120) {
    return { error: "Title must be 120 characters or fewer." };
  }

  const auth = await requireOnboardingFreelancer();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const { supabase, user } = auth;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      title,
      freelancer_id: user.id,
      client_id: null,
      client_email: null,
      status: "discovery",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  const advanced = await advanceOnboardingStep("project");
  if (advanced.error) {
    return { error: advanced.error, projectId: project.id };
  }

  return { path: advanced.path, projectId: project.id };
}

/** Invite a client during onboarding (any project owned by freelancer). */
export async function inviteOnboardingClient(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!projectId) {
    return { error: "Choose a project." };
  }
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return { error: "Enter a valid client email." };
  }

  const auth = await requireOnboardingFreelancer();
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

  let clientId: string | null = null;
  let existingClient = false;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", clientEmail)
    .maybeSingle();

  if (existing) {
    clientId = existing.id;
    existingClient = true;
  }

  const { error } = await supabase
    .from("projects")
    .update({
      client_email: clientEmail,
      client_id: clientId,
    })
    .eq("id", projectId)
    .eq("freelancer_id", user.id);

  if (error) {
    return { error: error.message };
  }

  const { sendProjectInvite } = await import("@/utils/email/send-project-invite");
  const invite = await sendProjectInvite({
    to: clientEmail,
    projectTitle: projectRow.title,
    freelancerName: displayName(profile, user.email ?? "") || "your contact",
    existingClient,
    businessName: profile.business_name,
    logoUrl: profile.logo_url,
    brandPrimary: profile.brand_primary,
  });

  const advanced = await advanceOnboardingStep("invite");
  if (advanced.error) {
    return {
      error: advanced.error,
      inviteSent: invite.sent,
    };
  }

  return {
    path: advanced.path,
    inviteSent: invite.sent,
  };
}

/** Resolve which step a freelancer should be on (for layout guards). */
export async function getOnboardingResumePath() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { path: "/?auth=signin&next=/onboarding" as const };
  }

  const ctx = await loadOnboardingContext(supabase, user.id);
  if (!ctx || ctx.profile.role !== "freelancer") {
    return { path: "/dashboard" as const };
  }

  if (!freelancerNeedsOnboarding(ctx.profile)) {
    return { path: "/dashboard" as const };
  }

  const step = resolveResumeStep(ctx);
  if (ctx.profile.onboarding_step !== step) {
    await supabase
      .from("users")
      .update({ onboarding_step: step })
      .eq("id", user.id);
  }

  return { path: onboardingPath(step), step, ctx };
}
