"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import { deleteAccount } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type DeleteAccountFormProps = {
  email: string;
  role: UserRole;
};

const FREELANCER_WARNINGS = [
  "Any active Portal Pro trial or subscription will be canceled when possible.",
  "Stripe Connect payout access for this account will no longer work from this portal.",
  "Outstanding client invoices in this portal will be removed with your projects. This does not erase money already owed outside the app.",
  "All of your projects, files, and client access to them will be permanently deleted.",
  "This cannot be undone.",
] as const;

const CLIENT_WARNINGS = [
  "You will lose access to every project and file shared with you in this portal.",
  "Unpaid invoices you still owe are not erased by deleting your account. The workspace owner may keep their own records.",
  "Projects stay with the workspace owner; your client link is removed.",
  "This cannot be undone.",
] as const;

export function DeleteAccountForm({ email, role }: DeleteAccountFormProps) {
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const warnings = role === "freelancer" ? FREELANCER_WARNINGS : CLIENT_WARNINGS;
  const normalizedEmail = email.trim().toLowerCase();

  const confirmationMatches = useMemo(() => {
    const value = confirmation.trim();
    return value === "DELETE" || value.toLowerCase() === normalizedEmail;
  }, [confirmation, normalizedEmail]);

  const canSubmit = confirmationMatches && acknowledged && !pending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canSubmit) return;

    const formData = new FormData();
    formData.set("confirmation", confirmation.trim());
    formData.set("acknowledged", "on");

    startTransition(async () => {
      const result = await deleteAccount(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-red-200/80 bg-red-50/60 px-3.5 py-3">
        <AlertTriangle
          className="mt-0.5 size-4 shrink-0 text-red-700"
          aria-hidden
        />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-900">
            Delete your account permanently
          </p>
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-red-900/90">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deleteAccountConfirmation">
            Type <span className="font-semibold text-zinc-900">DELETE</span> or
            your email to confirm
          </Label>
          <Input
            id="deleteAccountConfirmation"
            name="confirmation"
            autoComplete="off"
            spellCheck={false}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
            aria-invalid={confirmation.length > 0 && !confirmationMatches}
            className={cn(
              confirmation.length > 0 &&
                !confirmationMatches &&
                "border-red-300 focus-visible:border-red-400 focus-visible:ring-red-200/50",
            )}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="acknowledged"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-zinc-300 text-red-700 accent-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          />
          <span>
            I understand this permanently deletes my account and cannot be
            undone.
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={!canSubmit}
          className="shadow-sm"
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Deleting…
            </>
          ) : (
            "Delete account forever"
          )}
        </Button>
      </form>
    </div>
  );
}
