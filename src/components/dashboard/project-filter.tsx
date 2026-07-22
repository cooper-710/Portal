"use client";

import { useRouter } from "next/navigation";
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
  /** Path to navigate when the filter changes (query `project` is set/cleared). */
  basePath?: string;
};

export function ProjectFilter({
  projects,
  value,
  className,
  basePath = "/dashboard",
}: ProjectFilterProps) {
  const router = useRouter();

  const options = [
    { value: "", label: "All projects" },
    ...projects.map((project) => ({
      value: project.id,
      label: project.title,
    })),
  ];

  function onChange(next: string) {
    router.push(next ? `${basePath}?project=${next}` : basePath, {
      scroll: false,
    });
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
        onChange={onChange}
        options={options}
        branded
        triggerClassName="h-9 font-medium shadow-sm"
        contentClassName="min-w-[14rem]"
      />
    </div>
  );
}
