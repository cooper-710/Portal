"use client";

import { FolderKanban } from "lucide-react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProjectOption = {
  id: string;
  title: string;
};

type ProjectFilterProps = {
  projects: ProjectOption[];
  /** null = All projects */
  value: string | null;
  className?: string;
  /** Path used when writing `?project=` via soft history replace. */
  basePath?: string;
  /** Called immediately when the filter changes (before any navigation). */
  onChange?: (projectId: string | null) => void;
};

/** Soft-replace `?project=` without triggering a Next.js RSC navigation. */
export function softReplaceProjectQuery(
  basePath: string,
  projectId: string | null,
) {
  const url = projectId ? `${basePath}?project=${projectId}` : basePath;
  window.history.replaceState(
    window.history.state,
    "",
    url,
  );
}

export function ProjectFilter({
  projects,
  value,
  className,
  basePath = "/dashboard",
  onChange,
}: ProjectFilterProps) {
  const options = [
    { value: "", label: "All projects" },
    ...projects.map((project) => ({
      value: project.id,
      label: project.title,
    })),
  ];

  function handleChange(next: string) {
    const projectId = next || null;
    softReplaceProjectQuery(basePath, projectId);
    onChange?.(projectId);
  }

  return (
    <div className={cn("flex min-w-[11rem] max-w-[16rem] flex-col gap-1", className)}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        <FolderKanban className="size-3 text-[color:var(--brand-primary)]" />
        Project
      </span>
      <Select
        aria-label="Filter by project"
        value={value ?? ""}
        onChange={handleChange}
        options={options}
        branded
        triggerClassName="h-9 font-medium shadow-sm"
        contentClassName="min-w-[14rem]"
      />
    </div>
  );
}
