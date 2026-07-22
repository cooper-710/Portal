"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteFooter } from "@/components/site-footer";
import {
  authErrorMessage,
  isEmailOtpType,
  mapAuthError,
} from "@/utils/supabase/auth-errors";
import { createClient } from "@/utils/supabase/client";

/**
 * Prefetch-safe confirmation page.
 * Email scanners that only GET this URL will not consume the OTP.
 * The user must click Continue to complete verification.
 */
export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next") ?? "/dashboard";
    return next.startsWith("/") ? next : "/dashboard";
  }, [searchParams]);

  const confirmationUrl = searchParams.get("confirmation_url");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");

  const hasPayload = Boolean(
    confirmationUrl || code || (tokenHash && isEmailOtpType(typeParam)),
  );

  async function handleContinue() {
    setLoading(true);
    setError(null);

    try {
      // Option A: delayed navigation into Supabase ConfirmationURL (prefetch bypass)
      if (confirmationUrl) {
        const url = new URL(confirmationUrl);
        // Ensure redirect lands on our callback after Supabase verifies.
        if (!url.searchParams.get("redirect_to")) {
          url.searchParams.set(
            "redirect_to",
            `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          );
        }
        window.location.assign(url.toString());
        return;
      }

      const supabase = createClient();

      // Option B: PKCE auth code exchange (same browser that requested the link)
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(authErrorMessage(mapAuthError(exchangeError)));
          setLoading(false);
          return;
        }
        router.replace(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      // Option C: token_hash from custom email template
      if (tokenHash && isEmailOtpType(typeParam)) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: typeParam as EmailOtpType,
          token_hash: tokenHash,
        });
        if (verifyError) {
          setError(authErrorMessage(mapAuthError(verifyError)));
          setLoading(false);
          return;
        }
        router.replace(`/auth/continue?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setError(authErrorMessage("missing_token"));
      setLoading(false);
    } catch {
      setError(authErrorMessage("exchange_failed"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-zinc-50">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle>Confirm your email</CardTitle>
            <CardDescription>
              Click continue to verify this address. Next you&apos;ll set a
              password (so you can sign in later without a magic link). This extra
              step also keeps email scanners from consuming your one-time link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasPayload ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  This confirmation link is missing sign-in details. Go back to
                  login and request a new magic link.
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-2">
                  <p>{error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/login?error=otp_expired&next=${encodeURIComponent(nextPath)}`,
                      )
                    }
                  >
                    Request a new link
                  </Button>
                </div>
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={loading || !hasPayload}
              onClick={() => void handleContinue()}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirming…
                </>
              ) : (
                "Confirm email & continue"
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
      <SiteFooter compact />
    </div>
  );
}
