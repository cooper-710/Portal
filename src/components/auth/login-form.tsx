"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FULL_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateFullName,
  validatePassword,
} from "@/lib/account-validation";
import {
  authErrorMessage,
  isEmailRateLimitError,
} from "@/utils/supabase/auth-errors";
import { createClient } from "@/utils/supabase/client";

type AuthMode = "signup" | "signin";

type LoginFormProps = {
  nextPath?: string;
  /** When false, mode switches recalculate next (signup→billing, signin→dashboard). */
  nextPathExplicit?: boolean;
  initialError?: string | null;
  initialMode?: AuthMode;
  /** Invite flow: provision as client instead of freelancer workspace. */
  signupRole?: "freelancer" | "client";
};

function defaultNextForMode(
  mode: AuthMode,
  signupRole: "freelancer" | "client",
) {
  if (mode === "signin") return "/dashboard";
  return signupRole === "freelancer" ? "/dashboard/billing" : "/dashboard";
}

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
  nextPathExplicit = false,
  initialError = null,
  initialMode = "signup",
  signupRole = "freelancer",
}: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(Boolean(initialError));
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authErrorMessage(initialError),
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setConfirmSent(false);
    setPassword("");
  }

  const effectiveNext = nextPathExplicit
    ? nextPath
    : defaultNextForMode(mode, signupRole);

  const busy = loading || oauthLoading;

  async function continueWithGoogle() {
    setOauthLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const params = new URLSearchParams({
        next: effectiveNext,
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
      // On success the browser redirects to Google — keep spinner visible.
    } catch {
      setError(authErrorMessage("exchange_failed"));
      setOauthLoading(false);
    }
  }

  async function signUpWithPassword() {
    const nameError = validateFullName(fullName);
    if (nameError) {
      setError(nameError);
      return false;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }

    const name = fullName.trim();
    const supabase = createClient();
    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(effectiveNext)}`;

    if (confirmSent) {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo },
      });
      if (resendError) {
        const code = (resendError as { code?: string }).code;
        if (isEmailRateLimitError({ code, message: resendError.message })) {
          setError(authErrorMessage("email_rate_limit"));
        } else {
          setError(resendError.message);
        }
        return false;
      }
      setMessage("Confirmation email resent. Check your inbox.");
      return true;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { role: signupRole, full_name: name },
      },
    });

    if (signUpError) {
      const code = (signUpError as { code?: string }).code;
      if (isEmailRateLimitError({ code, message: signUpError.message })) {
        setError(authErrorMessage("email_rate_limit"));
      } else {
        setError(signUpError.message);
      }
      return false;
    }

    // Confirm email OFF → session returned; mark password set and continue.
    if (data.session) {
      await supabase
        .from("users")
        .update({ password_set: true, full_name: name })
        .eq("id", data.session.user.id);

      window.location.assign(
        `/auth/continue?next=${encodeURIComponent(effectiveNext)}`,
      );
      return true;
    }

    // Confirm email ON → wait for confirmation link (via SMTP once configured).
    setConfirmSent(true);
    setMessage(
      signupRole === "client"
        ? "Check your email and open the confirmation link to finish joining this project."
        : "Check your email and open the confirmation link. Then you’ll start your free trial.",
    );
    return true;
  }

  async function signInWithPassword() {
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        setError(
          "Incorrect email or password. New here? Use Continue with Google, or Sign up with email.",
        );
      } else if (
        isEmailRateLimitError({
          code: (signInError as { code?: string }).code,
          message: signInError.message,
        })
      ) {
        setError(authErrorMessage("email_rate_limit"));
      } else {
        setError(signInError.message);
      }
      return false;
    }

    window.location.assign(
      `/auth/continue?next=${encodeURIComponent(effectiveNext)}`,
    );
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (mode === "signin") {
        await signInWithPassword();
      } else {
        await signUpWithPassword();
      }
    } catch {
      setError(authErrorMessage("exchange_failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-muted-foreground hover:text-zinc-900"
          }`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "signin"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-muted-foreground hover:text-zinc-900"
          }`}
        >
          Sign in
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">
              {mode === "signup" ? "Sign-up issue" : "Sign-in issue"}
            </p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {mode === "signup" && signupRole === "client" ? (
        <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-blue-900">
          You’re joining as a client for a project invite.
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
        disabled={busy}
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
        {mode === "signup"
          ? "Uses your Google account — no confirmation email."
          : "Fastest way back into your workspace."}
      </p>

      {!showEmailForm ? (
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-zinc-900 hover:underline"
          onClick={() => setShowEmailForm(true)}
          disabled={busy}
        >
          {mode === "signup"
            ? "Or sign up with email and password"
            : "Or sign in with email and password"}
        </button>
      ) : (
        <>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-card px-2 text-muted-foreground">
                Email fallback
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="fullName">Your name</Label>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={FULL_NAME_MAX_LENGTH}
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === "signup" ? "Create password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={PASSWORD_MIN_LENGTH}
                placeholder={
                  mode === "signup"
                    ? `At least ${PASSWORD_MIN_LENGTH} characters`
                    : "Your password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === "signup" && !confirmSent ? (
                <p className="text-xs text-muted-foreground">
                  {signupRole === "freelancer"
                    ? "Creates your workspace. If email confirmation is on, you’ll confirm once, then start your free trial."
                    : "Creates your client account. If email confirmation is on, you’ll confirm once, then open your project."}
                </p>
              ) : mode === "signin" ? (
                <p className="text-xs text-muted-foreground">
                  Prefer Google above when you can — no password to remember.
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {mode === "signin" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "signin" ? (
                "Sign in with email"
              ) : confirmSent ? (
                "Resend confirmation email"
              ) : signupRole === "client" ? (
                "Join as client with email"
              ) : (
                "Create workspace with email"
              )}
            </Button>

            {message ? (
              <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {message}
              </p>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
