"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FULL_NAME_MAX_LENGTH } from "@/lib/account-validation";
import { authErrorMessage } from "@/utils/supabase/auth-errors";
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
  const [linkSent, setLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authErrorMessage(initialError),
  );

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setLinkSent(false);
    setPassword("");
  }

  const effectiveNext = nextPathExplicit
    ? nextPath
    : defaultNextForMode(mode, signupRole);

  async function sendMagicLink() {
    const name = fullName.trim();
    if (!name) {
      setError("Please enter your name.");
      return false;
    }
    if (name.length > FULL_NAME_MAX_LENGTH) {
      setError(`Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`);
      return false;
    }

    const supabase = createClient();
    const origin = window.location.origin;

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(effectiveNext)}`,
        shouldCreateUser: true,
        data: { role: signupRole, full_name: name },
      },
    });

    if (signInError) {
      const code = (signInError as { code?: string }).code;
      setError(
        code === "otp_expired" ||
          signInError.message.toLowerCase().includes("expired")
          ? authErrorMessage("otp_expired")
          : signInError.message,
      );
      return false;
    }

    setLinkSent(true);
    setMessage(
      signupRole === "client"
        ? "Check your email and open the confirmation link. Next you’ll set a password, then open your project."
        : "Check your email and open the confirmation link. Next you’ll set a password, then start your free trial.",
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
          "Incorrect email or password. New here? Use Sign up with a magic link first, then set a password.",
        );
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
        await sendMagicLink();
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">
                {mode === "signup" ? "Sign-up link issue" : "Sign-in issue"}
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

        {mode === "signup" ? (
          !linkSent ? (
            <p className="text-xs text-muted-foreground">
              We’ll email a confirmation link. After you open it, you’ll set a
              password
              {signupRole === "freelancer"
                ? ", then start your free trial."
                : "."}
            </p>
          ) : null
        ) : (
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={4}
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              First time? Use Sign up with a magic link, then create a password.
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {mode === "signin" ? "Signing in…" : "Sending link…"}
            </>
          ) : mode === "signin" ? (
            "Sign in"
          ) : linkSent || error ? (
            "Resend confirmation link"
          ) : signupRole === "client" ? (
            "Join as client"
          ) : (
            "Create freelancer workspace"
          )}
        </Button>

        {message ? (
          <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
