export type PreviewKind = "image" | "pdf" | "text" | "other";

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "avif",
  "bmp",
]);

const PDF_EXT = new Set(["pdf"]);

const TEXT_EXT = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "sql",
  "yml",
  "yaml",
  "toml",
  "ini",
  "env",
  "log",
  "sh",
  "bash",
  "zsh",
]);

export function fileExtension(fileName: string | null | undefined): string {
  if (!fileName) return "";
  const base = fileName.split(/[/\\]/).pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Infer preview kind from MIME when present, else from file extension. */
export function getPreviewKind(
  fileName: string | null | undefined,
  mimeType?: string | null,
): PreviewKind {
  const mime = (mimeType ?? "").toLowerCase().split(";")[0]?.trim();

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript"
  ) {
    return "text";
  }

  const ext = fileExtension(fileName);
  if (IMAGE_EXT.has(ext)) return "image";
  if (PDF_EXT.has(ext)) return "pdf";
  if (TEXT_EXT.has(ext)) return "text";
  return "other";
}

export function previewLabel(kind: PreviewKind): string {
  switch (kind) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "text":
      return "Text";
    default:
      return "File";
  }
}

/** Soft cap for in-modal text preview (characters). */
export const TEXT_PREVIEW_MAX_CHARS = 200_000;
