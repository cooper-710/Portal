import type { User } from "@supabase/supabase-js";

import type { createClient } from "@/utils/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export type PreferredSignupRole = "freelancer" | "client";

/** True when the auth user signed in via a social provider (not email/password). */
export function isOAuthUser(user: User): boolean {
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider !== "email") {
    return true;
  }

  const providers = user.app_metadata?.providers;
  if (
    Array.isArray(providers) &&
    providers.some((value) => typeof value === "string" && value !== "email")
  ) {
    return true;
  }

  return Boolean(
    user.identities?.some(
      (identity) => identity.provider && identity.provider !== "email",
    ),
  );
}

/** Prefer Google's full_name, then name, from user_metadata. */
export function displayNameFromMetadata(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const raw =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isNewAuthUser(user: User, windowMs = 10 * 60 * 1000): boolean {
  const created = Date.parse(user.created_at);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < windowMs;
}

/**
 * After Google (or other OAuth) login:
 * - Mark password_set so users skip /onboarding/password
 * - Fill full_name from Google metadata when empty
 * - Apply preferred client role on first login when requested
 */
export async function syncOAuthProfile(
  supabase: ServerSupabase,
  user: User,
  preferredRole?: PreferredSignupRole | null,
): Promise<void> {
  if (!isOAuthUser(user)) return;

  const { data: profile } = await supabase
    .from("users")
    .select("password_set, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return;

  const updates: {
    password_set?: boolean;
    full_name?: string;
    role?: PreferredSignupRole;
  } = {};

  if (!profile.password_set) {
    updates.password_set = true;
  }

  const metaName = displayNameFromMetadata(user);
  if (!profile.full_name?.trim() && metaName) {
    updates.full_name = metaName;
  }

  if (
    preferredRole === "client" &&
    profile.role === "freelancer" &&
    isNewAuthUser(user)
  ) {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("freelancer_id", user.id);

    if (!count) {
      updates.role = "client";
    }
  }

  if (Object.keys(updates).length === 0) return;

  await supabase.from("users").update(updates).eq("id", user.id);
}
