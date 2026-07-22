"use client";

import { useEffect, useState } from "react";
import { File, FileCode, FileText, Loader2 } from "lucide-react";

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

  if (kind === "image" && url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className={cn("absolute inset-0 size-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  if (kind === "image" && !failed && !url) {
    return <Loader2 className={cn("size-5 animate-spin text-zinc-400", className)} />;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-4 text-center",
        className,
      )}
    >
      <FileTypeIcon kind={kind} />
      {label ? (
        <p className="line-clamp-2 text-xs text-zinc-500">{label}</p>
      ) : null}
    </div>
  );
}
