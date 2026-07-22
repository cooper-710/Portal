"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { updateAccountName } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FULL_NAME_MAX_LENGTH } from "@/lib/account-validation";

type ProfileNameFormProps = {
  initialFullName?: string | null;
  email: string;
};

export function ProfileNameForm({
  initialFullName = "",
  email,
}: ProfileNameFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("fullName", fullName.trim());

    startTransition(async () => {
      const result = await updateAccountName(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage("Name saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="profileFullName">Display name</Label>
        <Input
          id="profileFullName"
          type="text"
          autoComplete="name"
          required
          maxLength={FULL_NAME_MAX_LENGTH}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Alex Rivera"
        />
        <p className="text-xs text-muted-foreground">
          Shown to others in the portal. Sign-in stays {email}.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700">{message}</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save name"
        )}
      </Button>
    </form>
  );
}
