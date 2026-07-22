"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Download,
  Eye,
  File,
  FileCheck2,
  FileCode,
  FileText,
  Loader2,
} from "lucide-react";

import { getAssetDownloadUrl } from "@/app/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getPreviewKind,
  previewLabel,
  TEXT_PREVIEW_MAX_CHARS,
  type PreviewKind,
} from "@/lib/file-preview";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types/database";

export type DeliverableListItem = Asset & {
  projectTitle: string;
};

type LatestDeliverablesProps = {
  items: DeliverableListItem[];
  className?: string;
  limit?: number;
};

function formatShortDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fileLabel(asset: Asset) {
  return asset.file_name?.trim() || asset.file_url.split("/").pop() || "File";
}

function FileTypeIcon({
  kind,
  className,
}: {
  kind: PreviewKind;
  className?: string;
}) {
  const cls = cn("size-8 text-zinc-400", className);
  if (kind === "pdf") return <FileText className={cls} />;
  if (kind === "text") return <FileCode className={cls} />;
  return <File className={cls} />;
}

export function LatestDeliverables({
  items,
  className,
  limit = 5,
}: LatestDeliverablesProps) {
  const preview = items.slice(0, limit);
  const [viewing, setViewing] = useState<DeliverableListItem | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewText, setViewText] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function openPreview(asset: DeliverableListItem) {
    setViewing(asset);
    setViewUrl(null);
    setViewText(null);
    setViewError(null);
    setViewLoading(true);

    const result = await getAssetDownloadUrl(asset.id);
    if (result.error || !result.url) {
      setViewError(result.error ?? "Unable to open file.");
      setViewLoading(false);
      return;
    }

    setViewUrl(result.url);
    const kind = getPreviewKind(asset.file_name);
    if (kind === "text") {
      try {
        const response = await fetch(result.url);
        const text = await response.text();
        setViewText(
          text.length > TEXT_PREVIEW_MAX_CHARS
            ? `${text.slice(0, TEXT_PREVIEW_MAX_CHARS)}\n\n… Preview truncated. Download the full file to see the rest.`
            : text,
        );
      } catch {
        setViewError("Unable to load text preview.");
      }
    }
    setViewLoading(false);
  }

  function closeViewer(open: boolean) {
    if (open) return;
    setViewing(null);
    setViewUrl(null);
    setViewText(null);
    setViewError(null);
    setViewLoading(false);
  }

  async function downloadAsset(asset: DeliverableListItem) {
    setDownloadingId(asset.id);
    try {
      const result = await getAssetDownloadUrl(asset.id);
      if (result.error || !result.url) {
        setViewError(result.error ?? "Unable to download file.");
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.download = fileLabel(asset);
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      setDownloadingId(null);
    }
  }

  const viewingKind = viewing ? getPreviewKind(viewing.file_name) : null;

  return (
    <>
      <section
        className={cn(
          "rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5",
          className,
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <FileCheck2 className="size-4 text-blue-600" />
            Latest deliverables
          </div>
          {preview[0] ? (
            <Link
              href={`/dashboard/projects/${preview[0].project_id}`}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Open project
            </Link>
          ) : null}
        </div>

        {preview.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            className="border-0 bg-transparent py-6"
            title="No deliverables yet"
            description="Shared files marked as deliverables will show up here."
          />
        ) : (
          <ul className="grid gap-2">
            {preview.map((asset) => (
              <li
                key={asset.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {fileLabel(asset)}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {asset.projectTitle} · {formatShortDate(asset.created_at)}
                    {asset.review_status
                      ? ` · ${asset.review_status.replaceAll("_", " ")}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 border-zinc-200 bg-white shadow-sm"
                    onClick={() => void openPreview(asset)}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(viewing)} onOpenChange={closeViewer}>
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-zinc-200 px-4 py-3 pr-12">
            <DialogTitle className="truncate">
              {viewing ? fileLabel(viewing) : "File"}
            </DialogTitle>
            <DialogDescription>
              {viewingKind
                ? `${previewLabel(viewingKind)} preview`
                : "File preview"}
              {viewing ? ` · ${viewing.projectTitle}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto bg-zinc-50 px-4 py-4">
            {viewLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                Loading preview…
              </div>
            ) : viewError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {viewError}
              </div>
            ) : viewingKind === "image" && viewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewUrl}
                alt={viewing ? fileLabel(viewing) : "Preview"}
                className="mx-auto max-h-[min(60vh,560px)] w-auto max-w-full object-contain"
              />
            ) : viewingKind === "pdf" && viewUrl ? (
              <iframe
                title={viewing ? fileLabel(viewing) : "PDF preview"}
                src={viewUrl}
                className="h-[min(60vh,560px)] w-full rounded-md border border-zinc-200 bg-white"
              />
            ) : viewingKind === "text" && viewText != null ? (
              <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-800">
                {viewText}
              </pre>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
                {viewingKind ? (
                  <FileTypeIcon kind={viewingKind} className="size-10" />
                ) : null}
                <p className="text-sm font-medium text-zinc-800">
                  In-app preview isn’t available for this file type
                </p>
                <p className="max-w-sm text-xs text-zinc-500">
                  Download the file to open it in another app.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-zinc-200 bg-white sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={!viewing || downloadingId === viewing.id || !viewUrl}
              onClick={() => {
                if (viewing) void downloadAsset(viewing);
              }}
            >
              {viewing && downloadingId === viewing.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download
            </Button>
            {viewing ? (
              <Link
                href={`/dashboard/projects/${viewing.project_id}`}
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                Open project
              </Link>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
