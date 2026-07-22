/**
 * Production env validation, fail fast when critical secrets are missing.
 * Safe to import from API routes and server layouts (no secrets returned).
 */

export const CRITICAL_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_SAAS_PRICE_ID",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type CriticalEnvKey = (typeof CRITICAL_ENV_KEYS)[number];

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function getMissingCriticalEnv(
  keys: readonly CriticalEnvKey[] = CRITICAL_ENV_KEYS,
): CriticalEnvKey[] {
  return keys.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "" || value.includes("...");
  });
}

export type EnvValidationResult =
  | { ok: true; missing: [] }
  | { ok: false; missing: CriticalEnvKey[] };

/**
 * In production, returns missing critical keys.
 * In development, always ok (so local partial setups still boot).
 */
export function validateCriticalEnv(
  options?: { force?: boolean },
): EnvValidationResult {
  if (!options?.force && !isProductionRuntime()) {
    return { ok: true, missing: [] };
  }

  const missing = getMissingCriticalEnv();
  if (missing.length === 0) {
    return { ok: true, missing: [] };
  }
  return { ok: false, missing };
}

/** Throw in production when critical env is incomplete (call from API routes). */
export function assertCriticalEnv() {
  const result = validateCriticalEnv();
  if (!result.ok) {
    const list = result.missing.join(", ");
    console.error(`[env] Missing critical production env: ${list}`);
    throw new Error(`Missing critical production environment variables: ${list}`);
  }
}

/** Presence checks for /api/health, never returns secret values. */
export function envPresenceReport() {
  const checks: Record<string, boolean> = {};
  for (const key of CRITICAL_ENV_KEYS) {
    const value = process.env[key];
    checks[key] = Boolean(value && value.trim() && !value.includes("..."));
  }
  checks.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim(),
  );
  checks.RESEND_API_KEY = Boolean(process.env.RESEND_API_KEY?.trim());
  return checks;
}
