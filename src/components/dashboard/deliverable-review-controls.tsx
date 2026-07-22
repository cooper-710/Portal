"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react";

import { reviewDeliverable } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeliverableReviewControlsProps = {
  actionId: string;
  fileName: string;
  className?: string;
};

export function DeliverableReviewControls({
  actionId,
  fileName,
  className,
}: DeliverableReviewControlsProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<
    "approved" | "changes_requested" | null
  >(null);
  const [submitting, setSubmitting] = useState<
    "approved" | "changes_requested" | null
  >(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: "approved" | "changes_requested") {
    const trimmedNote = note.trim();
    if (decision === "changes_requested" && !trimmedNote) {
      setError("Describe what needs to change before sending the request.");
      return;
    }

    setError(null);
    setSubmitting(decision);
    const formData = new FormData();
    formData.set("actionId", actionId);
    formData.set("decision", decision);
    formData.set("note", decision === "changes_requested" ? trimmedNote : "");

    startTransition(async () => {
      const result = await reviewDeliverable(formData);
      if (result?.error) {
        setError(result.error);
        setSubmitting(null);
        return;
      }
      setCompleted(decision);
      router.refresh();
    });
  }

  if (completed) {
    return (
      <div
        className={cn(
          "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3",
          className,
        )}
        role="status"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="size-4" />
          {completed === "approved"
            ? `${fileName} approved`
            : `Changes requested for ${fileName}`}
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          The freelancer can see your decision now.
        </p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4",
        className,
      )}
      aria-label={`Review ${fileName}`}
    >
      <div className="flex items-start gap-2">
        <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-amber-700" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Review this deliverable
          </h3>
          <p className="mt-0.5 text-xs text-zinc-600">
            Preview {fileName} above, then approve it or explain what needs to
            change.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-zinc-700">
          Change request details
          <span className="font-normal text-zinc-500"> (required only for changes)</span>
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Be specific about what should change…"
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-[color:var(--brand-primary)] focus:ring-2"
        />
      </label>

      {error ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={pending}
          onClick={() => submit("approved")}
        >
          {submitting === "approved" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Approve deliverable
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => submit("changes_requested")}
        >
          {submitting === "changes_requested" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Request changes
        </Button>
      </div>
    </section>
  );
}
