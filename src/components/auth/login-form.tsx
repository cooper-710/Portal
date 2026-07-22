"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/utils/supabase/auth-errors";
import { createClient } from "@/utils/supabase/client";

type LoginFormProps = {
  nextPath?: string;
  initialError?: string | null;
  /** Invite flow: provision as client instead of workspace-owner (role id: freelancer). */
  signupRole?: "freelancer" | "client";
};

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm({
  nextPath = "/dashboard",
  initialError = null,
  signupRole = "freelancer",
}: LoginFormProps) {
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authErrorMessage(initialError),
  );

  async function continueWithGoogle() {
    setOauthLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const params = new URLSearchParams({
        next: nextPath,
      });
      if (signupRole === "client") {
        params.set("role", "client");
      }
      const redirectTo = `${origin}/auth/callback?${params.toString()}`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(false);
      }
      // On success the browser redirects to Google, keep spinner visible.
    } catch {
      setError(authErrorMessage("exchange_failed"));
      setOauthLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Sign-in issue</p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {signupRole === "client" ? (
        <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-blue-900">
          You’re joining as a client for a project invite.
        </p>
      ) : null}

      <Button
        type="button"
        className="h-11 w-full"
        disabled={oauthLoading}
        onClick={() => void continueWithGoogle()}
      >
        {oauthLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Redirecting to Google…
          </>
        ) : (
          <>
            <GoogleGlyph className="size-4" />
            Continue with Google
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {signupRole === "client"
          ? "Use the Google account that matches your invite email when possible."
          : "New and returning users: one click to your workspace."}
      </p>
    </div>
  );
}
