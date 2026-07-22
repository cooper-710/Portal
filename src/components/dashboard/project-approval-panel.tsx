"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react";

import { reviewProject } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { ClientAction } from "@/types/database";

function decisionLabel(action: ClientAction) {
  const decision = action.metadata?.decision;
  if (decision === "approved") return "Approved";
  if (decision === "changes_requested") return "Changes requested";
  return action.status === "open" ? "Awaiting client" : "Closed";
}

export function ProjectApprovalPanel({
  actions,
  isClient,
}: {
  actions: ClientAction[];
  isClient: boolean;
}) {
  const router = useRouter();
  const open = actions.find((action) => action.status === "open") ?? null;
  const latestDecision = actions.find(
    (action) => typeof action.metadata?.decision === "string",
  ) ?? null;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(decision: "approved" | "changes_requested") {
    if (!open) return;
    const data = new FormData();
    data.set("actionId", open.id);
    data.set("decision", decision);
    data.set("note", note);
    setError(null);
    startTransition(async () => {
      const result = await reviewProject(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {open ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-zinc-900">Final approval requested</p>
              <p className="mt-1 text-sm text-zinc-600">
                {isClient
                  ? "Confirm the project is complete, or send one clear list of remaining changes."
                  : "The client has been asked to approve the finished project or return it with feedback."}
              </p>
            </div>
          </div>
          {isClient ? (
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-zinc-600">Feedback for change requests</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="List the remaining changes..."
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending} onClick={() => submit("approved")} className="bg-emerald-600 hover:bg-emerald-700">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Approve project
                </Button>
                <Button disabled={pending} variant="outline" onClick={() => submit("changes_requested")}>
                  Request changes
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {latestDecision ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-zinc-900">Latest client decision</p>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700">
              {decisionLabel(latestDecision)}
            </span>
          </div>
          {typeof latestDecision.metadata?.review_note === "string" && latestDecision.metadata.review_note ? (
            <p className="mt-2 whitespace-pre-wrap text-zinc-600">{latestDecision.metadata.review_note}</p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-400">
            {new Date(latestDecision.completed_at ?? latestDecision.updated_at).toLocaleString()}
          </p>
        </div>
      ) : null}

      {!open && !latestDecision ? (
        <p className="text-sm text-zinc-500">
          Move the project to Review when it is ready for the client’s final decision.
        </p>
      ) : null}
    </div>
  );
}
