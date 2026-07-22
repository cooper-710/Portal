"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { updateAccountPassword } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN_LENGTH } from "@/lib/account-validation";

type ChangePasswordFormProps = {
  /** True when the user already has an email/password credential. */
  hasPassword: boolean;
};

export function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const formData = new FormData();
    formData.set("password", password);

    startTransition(async () => {
      const result = await updateAccountPassword(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPassword("");
      setConfirm("");
      setMessage(
        hasPassword
          ? "Password updated. Use it the next time you sign in."
          : "Password set. You can sign in with email and password next time.",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="settingsPassword">
          {hasPassword ? "New password" : "Create a password"}
        </Label>
        <Input
          id="settingsPassword"
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
        <Label htmlFor="settingsConfirm">Confirm password</Label>
        <Input
          id="settingsConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {hasPassword
            ? "Updates your sign-in password for this email."
            : "You signed up with a magic link. Set a password so you can sign in without email next time."}
        </p>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : hasPassword ? (
          "Update password"
        ) : (
          "Set password"
        )}
      </Button>
    </form>
  );
}
