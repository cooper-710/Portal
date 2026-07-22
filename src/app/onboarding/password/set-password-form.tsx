"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { setAccountPassword } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FULL_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/account-validation";

type SetPasswordFormProps = {
  initialFullName?: string | null;
  /** Authoritative post-password destination from the server. */
  nextPath?: string;
  /** When true, copy/CTA point at starting the free trial next. */
  headingToTrial?: boolean;
};

export function SetPasswordForm({
  initialFullName = "",
  nextPath: nextPathProp,
  headingToTrial = false,
}: SetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = (() => {
    if (nextPathProp?.startsWith("/")) return nextPathProp;
    const next = searchParams.get("next") ?? "/dashboard";
    return next.startsWith("/") ? next : "/dashboard";
  })();

  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (fullName.trim().length > FULL_NAME_MAX_LENGTH) {
      setError(`Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const formData = new FormData();
    formData.set("fullName", fullName.trim());
    formData.set("password", password);

    startTransition(async () => {
      const result = await setAccountPassword(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-md border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle>Email confirmed — set your password</CardTitle>
          <CardDescription>
            {headingToTrial
              ? "Create a password for next time. After this you’ll open Billing to start your free trial."
              : "Create a password so you can sign in next time without a magic link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your name</Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                required
                maxLength={FULL_NAME_MAX_LENGTH}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Alex Rivera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : headingToTrial ? (
                "Save & continue to free trial"
              ) : (
                "Save & continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
