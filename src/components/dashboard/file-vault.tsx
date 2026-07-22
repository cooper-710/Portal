"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  File,
  FileCode,
  FileText,
  FileUp,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import {
  deleteAsset,
  getAssetDownloadUrl,
  updateAssetVisibility,
  uploadAsset,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  getPreviewKind,
  previewLabel,
  TEXT_PREVIEW_MAX_CHARS,
  type PreviewKind,
} from "@/lib/file-preview";
import { cn } from "@/lib/utils";
import type { Asset, AssetVisibility } from "@/types/database";

type FileVaultProps = {
  projectId: string;
  assets: Asset[];
  /**
   * Freelancers can upload, set visibility, delete, and see internal + deliverable.
   * Clients only see deliverables (via RLS) and cannot upload or delete.
   */
  canManageVisibility?: boolean;
};

function VisibilityBadge({ visibility }: { visibility: AssetVisibility }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        visibility === "deliverable"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-600",
      )}
    >
      {visibility === "deliverable" ? "Deliverable" : "Internal"}
    </span>
  );
}

function TypeBadge({ kind }: { kind: PreviewKind }) {
  return (
    <span className="inline-flex items-center rounded border border-zinc-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
      {previewLabel(kind)}
    </span>
  );
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

function displayName(asset: Asset) {
  return asset.file_name?.trim() || asset.file_url.split("/").pop() || "File";
}

export function FileVault({
  projectId,
  assets,
  canManageVisibility = false,
}: FileVaultProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const canUpload = canManageVisibility;
  const [dragging, setDragging] = useState(false);
  const [visibility, setVisibility] = useState<AssetVisibility>("internal");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewText, setViewText] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (!canUpload) return;

    if (!files?.length) {
      setError("No file selected. Choose a file to upload.");
      setMessage(null);
      return;
    }

    // Capture before the input reset empties the live FileList.
    const file = files[0];
    const fileName = file?.name?.trim() || "Uploaded file";
    const visibilityLabel =
      visibility === "deliverable" ? "client deliverable" : "internal reference";

    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("file", file);
    formData.set("visibility", visibility);

    startTransition(async () => {
      const result = await uploadAsset(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage(`Uploaded ${fileName} as ${visibilityLabel}`);
      router.refresh();
    });
  }

  async function resolveSignedUrl(assetId: string) {
    const result = await getAssetDownloadUrl(assetId);
    if (result.error || !result.url) {
      throw new Error(result.error ?? "Unable to open file.");
    }
    return result.url;
  }

  async function downloadAsset(asset: Asset) {
    setDownloadingId(asset.id);
    setError(null);
    try {
      const url = await resolveSignedUrl(asset.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download file.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function openViewer(asset: Asset) {
    setViewingAsset(asset);
    setViewUrl(null);
    setViewText(null);
    setViewError(null);
    setViewLoading(true);

    try {
      const url = await resolveSignedUrl(asset.id);
      setViewUrl(url);

      const kind = getPreviewKind(asset.file_name);
      if (kind === "text") {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Unable to load file preview.");
        }
        const text = await response.text();
        if (text.length > TEXT_PREVIEW_MAX_CHARS) {
          setViewText(
            `${text.slice(0, TEXT_PREVIEW_MAX_CHARS)}\n\n… Preview truncated. Download the full file to see the rest.`,
          );
        } else {
          setViewText(text);
        }
      }
    } catch (err) {
      setViewError(err instanceof Error ? err.message : "Unable to open file.");
    } finally {
      setViewLoading(false);
    }
  }

  function closeViewer(open: boolean) {
    if (!open) {
      setViewingAsset(null);
      setViewUrl(null);
      setViewText(null);
      setViewError(null);
      setViewLoading(false);
    }
  }

  function toggleVisibility(asset: Asset) {
    const next: AssetVisibility =
      asset.visibility === "deliverable" ? "internal" : "deliverable";
    setUpdatingId(asset.id);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("assetId", asset.id);
    formData.set("visibility", next);

    startTransition(async () => {
      const result = await updateAssetVisibility(formData);
      setUpdatingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage(
        next === "deliverable"
          ? `"${displayName(asset)}" is now a client deliverable.`
          : `"${displayName(asset)}" is now internal only.`,
      );
      router.refresh();
    });
  }

  function handleDelete(asset: Asset) {
    if (!canManageVisibility) return;

    const name = displayName(asset);
    const confirmed = window.confirm(
      `Delete "${name}"? This permanently removes the file from storage and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(asset.id);
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("assetId", asset.id);

    startTransition(async () => {
      const result = await deleteAsset(formData);
      setDeletingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (viewingAsset?.id === asset.id) {
        closeViewer(false);
      }
      setMessage(`Deleted "${name}".`);
      router.refresh();
    });
  }

  const deliverables = assets.filter((a) => a.visibility === "deliverable");
  const internals = assets.filter((a) => a.visibility !== "deliverable");
  const viewingKind = viewingAsset
    ? getPreviewKind(viewingAsset.file_name)
    : null;

  return (
    <div className="space-y-4">
      {canUpload ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center transition-colors ${
            dragging
              ? "border-blue-500 bg-blue-50"
              : "border-zinc-300 bg-zinc-50/80"
          }`}
        >
          <Upload className="mb-3 size-8 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-900">
            Drag and drop a file here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, images, Office docs, ZIP — up to 50 MB
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Label
              htmlFor="upload-visibility"
              className="text-xs text-muted-foreground"
            >
              Upload as
            </Label>
            <select
              id="upload-visibility"
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as AssetVisibility)
              }
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm"
            >
              <option value="internal">Internal reference</option>
              <option value="deliverable">Client deliverable</option>
            </select>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-4"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileUp className="size-4" />
            )}
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {message ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {canManageVisibility ? (
        <>
          <AssetSection
            title="Client deliverables"
            empty="No deliverables shared with the client yet."
            assets={deliverables}
            canManageVisibility
            downloadingId={downloadingId}
            updatingId={updatingId}
            deletingId={deletingId}
            onView={openViewer}
            onDownload={downloadAsset}
            onToggleVisibility={toggleVisibility}
            onDelete={handleDelete}
          />
          <AssetSection
            title="Internal reference"
            empty="No internal files yet. Clients cannot see these."
            assets={internals}
            canManageVisibility
            downloadingId={downloadingId}
            updatingId={updatingId}
            deletingId={deletingId}
            onView={openViewer}
            onDownload={downloadAsset}
            onToggleVisibility={toggleVisibility}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <AssetSection
          title="Approved deliverables"
          empty="No deliverables available yet."
          assets={assets}
          canManageVisibility={false}
          downloadingId={downloadingId}
          updatingId={updatingId}
          deletingId={deletingId}
          onView={openViewer}
          onDownload={downloadAsset}
          onToggleVisibility={toggleVisibility}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={Boolean(viewingAsset)} onOpenChange={closeViewer}>
        <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-zinc-200 px-4 py-3 pr-12">
            <DialogTitle className="truncate">
              {viewingAsset ? displayName(viewingAsset) : "File"}
            </DialogTitle>
            <DialogDescription>
              {viewingKind
                ? `${previewLabel(viewingKind)} preview`
                : "File preview"}
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
                alt={viewingAsset ? displayName(viewingAsset) : "Preview"}
                className="mx-auto max-h-[min(60vh,560px)] w-auto max-w-full object-contain"
              />
            ) : viewingKind === "pdf" && viewUrl ? (
              <iframe
                title={viewingAsset ? displayName(viewingAsset) : "PDF preview"}
                src={viewUrl}
                className="h-[min(60vh,560px)] w-full rounded-md border border-zinc-200 bg-white"
              />
            ) : viewingKind === "text" && viewText != null ? (
              <pre className="overflow-auto rounded-md border border-zinc-200 bg-white p-3 text-xs leading-relaxed text-zinc-800 whitespace-pre-wrap break-words">
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
                <p className="max-w-sm text-xs text-muted-foreground">
                  Download the file to open it in another app.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-zinc-200 bg-white sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  !viewingAsset || downloadingId === viewingAsset.id || !viewUrl
                }
                onClick={() => {
                  if (viewingAsset) void downloadAsset(viewingAsset);
                }}
              >
                {viewingAsset && downloadingId === viewingAsset.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Download
              </Button>
              {canManageVisibility && viewingAsset ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletingId === viewingAsset.id}
                  onClick={() => handleDelete(viewingAsset)}
                >
                  {deletingId === viewingAsset.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetSection({
  title,
  empty,
  assets,
  canManageVisibility,
  downloadingId,
  updatingId,
  deletingId,
  onView,
  onDownload,
  onToggleVisibility,
  onDelete,
}: {
  title: string;
  empty: string;
  assets: Asset[];
  canManageVisibility: boolean;
  downloadingId: string | null;
  updatingId: string | null;
  deletingId: string | null;
  onView: (asset: Asset) => void;
  onDownload: (asset: Asset) => void;
  onToggleVisibility: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {assets.map((asset) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              canManageVisibility={canManageVisibility}
              downloading={downloadingId === asset.id}
              updating={updatingId === asset.id}
              deleting={deletingId === asset.id}
              onView={() => void onView(asset)}
              onDownload={() => void onDownload(asset)}
              onToggleVisibility={() => onToggleVisibility(asset)}
              onDelete={() => onDelete(asset)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AssetTile({
  asset,
  canManageVisibility,
  downloading,
  updating,
  deleting,
  onView,
  onDownload,
  onToggleVisibility,
  onDelete,
}: {
  asset: Asset;
  canManageVisibility: boolean;
  downloading: boolean;
  updating: boolean;
  deleting: boolean;
  onView: () => void;
  onDownload: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const name = displayName(asset);
  const kind = getPreviewKind(asset.file_name);

  return (
    <li className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={onView}
        className="group relative block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <div className="relative flex aspect-[16/10] items-center justify-center bg-zinc-100">
          <AssetPreviewThumb asset={asset} kind={kind} name={name} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
            <TypeBadge kind={kind} />
            {canManageVisibility ? (
              <VisibilityBadge visibility={asset.visibility} />
            ) : null}
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-900/0 opacity-0 transition-opacity group-hover:bg-zinc-900/25 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-sm">
              <Eye className="size-3.5" />
              View
            </span>
          </div>
        </div>
        <div className="space-y-0.5 border-t border-zinc-100 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(asset.created_at).toLocaleString()}
          </p>
        </div>
      </button>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 px-3 py-2">
        <Button type="button" size="sm" variant="outline" onClick={onView}>
          <Eye className="size-4" />
          View
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={downloading}
          onClick={onDownload}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download
        </Button>
        {canManageVisibility ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={updating || deleting}
              onClick={onToggleVisibility}
            >
              {updating ? <Loader2 className="size-4 animate-spin" /> : null}
              {asset.visibility === "deliverable"
                ? "Make internal"
                : "Share with client"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={deleting || updating}
              onClick={onDelete}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

function AssetPreviewThumb({
  asset,
  kind,
  name,
}: {
  asset: Asset;
  kind: PreviewKind;
  name: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (kind !== "image") return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await getAssetDownloadUrl(asset.id);
        if (cancelled) return;
        if (result.error || !result.url) {
          setFailed(true);
          return;
        }
        setUrl(result.url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [asset.id, kind]);

  if (kind === "image" && url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className="absolute inset-0 size-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  if (kind === "image" && !failed && !url) {
    return <Loader2 className="size-5 animate-spin text-zinc-400" />;
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 text-center">
      <FileTypeIcon kind={kind} />
      <p className="line-clamp-2 text-xs text-zinc-500">{name}</p>
    </div>
  );
}
