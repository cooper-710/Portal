import type { AuthError, EmailOtpType } from "@supabase/supabase-js";

export type AuthErrorCode =
  | "otp_expired"
  | "otp_disabled"
  | "access_denied"
  | "exchange_failed"
  | "missing_token"
  | "email_rate_limit"
  | "auth"
  | string;

const MESSAGES: Record<string, string> = {
  otp_expired:
    "This confirmation link has expired or was already used. Sign up again, or ask an admin to confirm your user in Supabase.",
  otp_disabled: "Email confirmation links are currently disabled for this project.",
  access_denied:
    "Access was denied. Try Continue with Google, or sign in with email and password.",
  exchange_failed:
    "We couldn't complete sign-in from that link. Try Continue with Google, or email and password.",
  missing_token:
    "That confirmation link is incomplete. Try Continue with Google, or email and password.",
  email_rate_limit:
    "Too many auth emails sent (Supabase built-in limit). Prefer Continue with Google, wait a few minutes, or turn off Confirm email until custom SMTP is set up (see docs/AUTH_EMAIL.md and docs/GOOGLE_AUTH.md).",
  auth: "Sign-in failed. Try Continue with Google, or email and password.",
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? `Sign-in failed (${code}). Try email and password.`;
}

export function isEmailRateLimitError(
  error: { message?: string; code?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "over_email_send_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("email rate limit exceeded")
  );
}

export function mapAuthError(error: AuthError | null | undefined): AuthErrorCode {
  if (!error) return "auth";

  const code = (error as AuthError & { code?: string }).code ?? "";
  const message = error.message.toLowerCase();

  if (isEmailRateLimitError({ code, message: error.message })) {
    return "email_rate_limit";
  }

  if (
    code === "otp_expired" ||
    message.includes("expired") ||
    message.includes("invalid") ||
    message.includes("otp")
  ) {
    return "otp_expired";
  }

  if (code) return code;
  return "exchange_failed";
}

export function isEmailOtpType(value: string | null): value is EmailOtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

export function loginErrorHref(code: AuthErrorCode, next = "/dashboard") {
  const params = new URLSearchParams({
    error: code,
    next,
  });
  return `/login?${params.toString()}`;
}
