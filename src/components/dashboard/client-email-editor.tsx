"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";

import { updateProjectClientEmail } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientEmailEditorProps = {
  projectId: string;
  initialEmail: string;
  linked: boolean;
};

export function ClientEmailEditor({
  projectId,
  initialEmail,
  linked,
}: ClientEmailEditorProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("clientEmail", email);

    startTransition(async () => {
      const result = await updateProjectClientEmail(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result.emailChanged && result.inviteSent) {
        setMessage("Client email updated and invite sent.");
      } else if (result.emailChanged) {
        setMessage(
          "Client email updated. Invite not sent (add RESEND_API_KEY to enable email).",
        );
      } else {
        setMessage("No changes to save.");
      }

      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="client-email">Client email</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="client-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="client@company.com"
            disabled={pending}
            className="bg-white"
          />
          <Button type="submit" disabled={pending || !dirty} className="sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            {dirty ? "Save & invite" : "Saved"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {linked
            ? "Linked to an existing Finalia account. Changing the email will re-invite and re-link."
            : "Optional. Add or change the email to invite the client to this project."}
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
