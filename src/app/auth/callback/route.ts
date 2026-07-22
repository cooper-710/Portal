import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import {
  isEmailOtpType,
  loginErrorHref,
  mapAuthError,
} from "@/utils/supabase/auth-errors";
import { resolvePostAuthPath } from "@/utils/supabase/post-auth";
import { createClient } from "@/utils/supabase/server";

/**
 * Server callback for magic-link / OTP redirects.
 *
 * Supports:
 * - PKCE `?code=` → exchangeCodeForSession
 * - `?token_hash=&type=` → verifyOtp (custom email templates)
 *
 * Prefetch-safe confirmations (button click) live at `/auth/confirm`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const errorParam =
    searchParams.get("error") ??
    searchParams.get("error_code") ??
    searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (errorParam) {
    const normalized =
      errorParam.toLowerCase().includes("otp") ||
      errorParam.toLowerCase().includes("expired")
        ? "otp_expired"
        : "access_denied";
    return NextResponse.redirect(`${origin}${loginErrorHref(normalized, safeNext)}`);
  }

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = await resolvePostAuthPath(safeNext);
      return NextResponse.redirect(`${origin}${destination}`);
    }
    return NextResponse.redirect(
      `${origin}${loginErrorHref(mapAuthError(error), safeNext)}`,
    );
  }

  if (tokenHash && isEmailOtpType(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error) {
      const destination = await resolvePostAuthPath(safeNext);
      return NextResponse.redirect(`${origin}${destination}`);
    }

    return NextResponse.redirect(
      `${origin}${loginErrorHref(mapAuthError(error), safeNext)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}${loginErrorHref("missing_token", safeNext)}`,
  );
}
