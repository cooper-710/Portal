import { freelancerHasWorkspaceAccess } from "@/utils/stripe/subscription";
import {
  syncOAuthProfile,
  type PreferredSignupRole,
} from "@/utils/supabase/oauth-profile";
import {
  freelancerNeedsPortalSetup,
  resolvePostAuthDestination,
} from "@/utils/supabase/post-auth-rules";
import { createClient } from "@/utils/supabase/server";

export type ResolvePostAuthOptions = {
  /** From login `?role=client` / OAuth redirect — applied on first Google signup. */
  preferredRole?: PreferredSignupRole | null;
};

/**
 * After magic-link / OTP / password / OAuth sign-in:
 * 1. OAuth users → password_set + full_name sync (skip password onboarding)
 * 2. Users without a password → onboarding password setup
 * 3. Freelancers without workspace access (and a generic /dashboard next)
 *    → /dashboard/billing so they can start/renew
 * 4. Freelancers with workspace access (trialing/active) whose next is billing
 *    → /dashboard (working overview), not billing
 * 5. Freelancers with access who have not customized/skipped portal branding
 *    → /onboarding/portal
 * Clients always keep dashboard (or their requested next).
 */
export async function resolvePostAuthPath(
  nextPath = "/dashboard",
  options: ResolvePostAuthOptions = {},
) {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return `/login?next=${encodeURIComponent(safeNext)}`;
  }

  await syncOAuthProfile(supabase, user, options.preferredRole);

  // Attach any projects invited to this email (pending client_email).
  if (user.email) {
    await supabase.rpc("link_projects_for_client", {
      p_user_id: user.id,
      p_email: user.email,
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "password_set, role, subscription_status, portal_setup_completed_at, business_name",
    )
    .eq("id", user.id)
    .maybeSingle();

  const hasWorkspaceAccess = freelancerHasWorkspaceAccess({
    role: profile?.role ?? "client",
    subscription_status: profile?.subscription_status ?? "none",
  });

  // Existing branding without the flag — stamp complete so we don't re-check forever.
  if (
    profile?.role === "freelancer" &&
    !profile.portal_setup_completed_at &&
    profile.business_name?.trim()
  ) {
    await supabase
      .from("users")
      .update({ portal_setup_completed_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return resolvePostAuthDestination({
    nextPath: safeNext,
    role: profile?.role,
    passwordSet: Boolean(profile?.password_set),
    hasWorkspaceAccess,
    needsPortalSetup: freelancerNeedsPortalSetup({
      role: profile?.role,
      portal_setup_completed_at: profile?.portal_setup_completed_at,
      business_name: profile?.business_name,
    }),
  });
}
