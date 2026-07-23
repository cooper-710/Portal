"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleCheckBig,
  Loader2,
  MessageSquareWarning,
  Upload,
} from "lucide-react";

import {
  acknowledgeDeliverableFeedback,
  updateProjectPhase,
} from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Asset, ProjectStatus } from "@/types/database";

type FeedbackItem = Pick<
  Asset,
  | "id"
  | "file_name"
  | "review_status"
  | "review_note"
  | "reviewed_at"
  | "feedback_reviewed_at"
  | "feedback_resolved_at"
>;

export function OwnerFeedbackResolution({
  projectId,
  projectStatus,
  feedback,
  hasDeliverables,
}: {
  projectId: string;
  projectStatus: ProjectStatus;
  feedback: FeedbackItem[];
  hasDeliverables: boolean;
}) {
  const router = useRouter();
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const complete = projectStatus === "completed" || projectStatus === "archived";
  const unresolved = feedback.filter(
    (item) =>
      item.review_status === "changes_requested" &&
      !item.feedback_resolved_at,
  );
  const unreviewed = unresolved.filter((item) => !item.feedback_reviewed_at);
  const showNoUploadCompletion =
    !complete && unresolved.length === 0 && !hasDeliverables;

  if (complete || (unresolved.length === 0 && !showNoUploadCompletion)) {
    return null;
  }

  function acknowledge(assetId: string) {
    setPendingAssetId(assetId);
    setError(null);
    const formData = new FormData();
    formData.set("assetId", assetId);

    startTransition(async () => {
      const result = await acknowledgeDeliverableFeedback(formData);
      setPendingAssetId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function completeProject() {
    setCompleting(true);
    setError(null);
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("status", "completed");

    startTransition(async () => {
      const result = await updateProjectPhase(formData);
      setCompleting(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (showNoUploadCompletion) {
    return (
      <section className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-zinc-50 via-white to-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <CircleCheckBig className="size-4 text-emerald-600" />
              No file deliverable required?
            </div>
            <p className="max-w-2xl text-sm text-zinc-600">
              For consulting, calls, or work delivered elsewhere, close the
              project without uploading a file.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={completeProject}
          >
            {completing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Complete without upload
          </Button>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      id="deliverable-feedback"
      className="scroll-mt-24 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <MessageSquareWarning className="size-4 text-amber-700" />
        Client change requests
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Review the feedback first. Once reviewed, share a revised deliverable
        or complete the project when no new file is needed.
      </p>

      <ul className="mt-4 grid gap-3">
        {unresolved.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-amber-200/70 bg-white p-3.5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {item.file_name?.trim() || "Deliverable"}
                </p>
                {item.review_note ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                    “{item.review_note}”
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">
                    The client requested changes without an additional note.
                  </p>
                )}
              </div>
              {item.feedback_reviewed_at ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="size-3.5" /> Reviewed
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => acknowledge(item.id)}
                >
                  {pendingAssetId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                  Mark feedback reviewed
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {unreviewed.length === 0 ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
          <p className="text-sm font-semibold text-emerald-900">
            Feedback reviewed—choose the next step
          </p>
          <p className="mt-1 text-sm text-emerald-800/80">
            A revised client deliverable automatically closes this request. If
            the work does not need another file, complete the project instead.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="#project-file-vault"
              className={cn(buttonVariants({ size: "sm" }), "shadow-sm")}
            >
              <Upload className="size-3.5" /> Upload revised deliverable
            </a>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={completeProject}
            >
              {completing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Mark project complete
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
