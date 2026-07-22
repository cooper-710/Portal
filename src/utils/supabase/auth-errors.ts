import type { AuthError, EmailOtpType } from "@supabase/supabase-js";

export type AuthErrorCode =
  | "otp_expired"
  | "otp_disabled"
  | "access_denied"
  | "exchange_failed"
  | "missing_token"
  | "auth"
  | string;

const MESSAGES: Record<string, string> = {
  otp_expired:
    "This magic link has expired or was already used. Request a new one below.",
  otp_disabled: "Email magic links are currently disabled for this project.",
  access_denied: "Access was denied. Please request a new magic link.",
  exchange_failed:
    "We couldn't complete sign-in from that link. Request a new magic link below.",
  missing_token: "That sign-in link is incomplete. Request a new magic link below.",
  auth: "Sign-in failed. Request a new magic link below.",
};

export function authErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? `Sign-in failed (${code}). Request a new magic link below.`;
}

export function mapAuthError(error: AuthError | null | undefined): AuthErrorCode {
  if (!error) return "auth";

  const code = (error as AuthError & { code?: string }).code ?? "";
  const message = error.message.toLowerCase();

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
