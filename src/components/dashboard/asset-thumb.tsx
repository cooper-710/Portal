"use client";

import { useEffect, useState } from "react";
import { File, FileCode, FileImage, FileText, Loader2 } from "lucide-react";

import { getAssetDownloadUrl } from "@/app/actions";
import { getPreviewKind, type PreviewKind } from "@/lib/file-preview";
import { cn } from "@/lib/utils";

export function FileTypeIcon({
  kind,
  className,
}: {
  kind: PreviewKind;
  className?: string;
}) {
  const cls = cn("size-8 text-zinc-400", className);
  if (kind === "pdf") return <FileText className={cls} />;
  if (kind === "text") return <FileCode className={cls} />;
  if (kind === "image") return <FileImage className={cls} />;
  return <File className={cls} />;
}

type AssetThumbProps = {
  assetId: string;
  fileName: string | null | undefined;
  /** `list` = compact square beside a row; `tile` = fills a parent preview frame. */
  variant?: "list" | "tile";
  /** Optional caption under the type icon when `variant="tile"` and there is no image. */
  label?: string;
  className?: string;
  alt?: string;
};

/**
 * Image thumbnail via signed URL, or a type icon placeholder for non-images.
 * Relies on getAssetDownloadUrl + RLS (clients only reach deliverables).
 */
export function AssetThumb({
  assetId,
  fileName,
  variant = "list",
  label,
  className,
  alt = "",
}: AssetThumbProps) {
  const kind = getPreviewKind(fileName);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (kind !== "image") return;

    let cancelled = false;
    setUrl(null);
    setFailed(false);

    void (async () => {
      try {
        const result = await getAssetDownloadUrl(assetId);
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
  }, [assetId, kind]);

  if (variant === "list") {
    return (
      <div
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100",
          className,
        )}
        aria-hidden={kind !== "image" || !url || failed}
      >
        {kind === "image" && url && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={alt}
            className="size-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : kind === "image" && !failed && !url ? (
          <Loader2 className="size-3.5 animate-spin text-zinc-400" />
        ) : (
          <FileTypeIcon kind={kind} className="size-4" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative size-full min-h-0 overflow-hidden bg-zinc-100",
        className,
      )}
    >
      {kind === "image" && url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : kind === "image" && !failed && !url ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
          <Loader2 className="size-5 animate-spin text-zinc-400" />
          <span className="sr-only">Loading preview</span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 text-center">
          <FileTypeIcon kind={kind} />
          {label ? (
            <p className="line-clamp-2 text-xs font-medium text-zinc-500">
              {failed && kind === "image" ? "Preview unavailable" : label}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
