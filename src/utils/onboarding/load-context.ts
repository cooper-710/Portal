import type { SupabaseClient } from "@supabase/supabase-js";

import type { OnboardingContext, OnboardingProfileSnapshot } from "./steps";

const PROFILE_SELECT =
  "role, subscription_status, stripe_charges_enabled, portal_setup_completed_at, business_name, onboarding_completed_at, onboarding_step";

export async function loadOnboardingContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<OnboardingContext | null> {
  const { data: profile } = await supabase
    .from("users")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, client_email, client_id")
    .eq("freelancer_id", userId)
    .limit(20);

  const list = projects ?? [];
  const hasProject = list.length > 0;
  const hasClientInvite = list.some(
    (project) => Boolean(project.client_id) || Boolean(project.client_email?.trim()),
  );

  return {
    profile: profile as OnboardingProfileSnapshot,
    hasProject,
    hasClientInvite,
  };
}
