"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronDown, FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { ProjectStatusBadge } from "@/components/dashboard/status-badge";
import type { ClientProject } from "@/lib/client-home-scope";
import { isCompletedProject, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile, ProjectStatus } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

type ClientProjectsPageProps = {
  profile: Profile;
  projects: ClientProject[];
};

export function ClientProjectsPage({
  profile,
  projects: initialProjects,
}: ClientProjectsPageProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [showCompleted, setShowCompleted] = useState(true);
  const [phaseLive, setPhaseLive] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const projectIdsKey = initialProjects
    .map((project) => project.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!projectIdsKey) return;

    const projectIds = projectIdsKey.split(",");
    const supabase = createClient();

    const channel = supabase
      .channel("client-projects-page-phases")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          const next = payload.new as { id?: string; status?: ProjectStatus };
          if (!next.id || !next.status || !projectIds.includes(next.id)) {
            return;
          }

          setProjects((current) =>
            current.map((project) =>
              project.id === next.id
                ? { ...project, status: next.status as ProjectStatus }
                : project,
            ),
          );
          setPhaseLive(true);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectIdsKey, router]);

  const activeProjects = projects.filter(
    (item) => !isCompletedProject(item.status),
  );
  const completedProjects = projects.filter((item) =>
    isCompletedProject(item.status),
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Client portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Projects
          </h1>
          <p className="text-sm text-zinc-500">
            {activeProjects.length} active
            {completedProjects.length > 0
              ? ` · ${completedProjects.length} completed`
              : ""}{" "}
            · {displayName(profile)}
          </p>
        </div>
        <span
          className={cn(
            "text-[11px] font-medium",
            phaseLive ? "text-emerald-700" : "text-zinc-400",
          )}
        >
          {phaseLive ? "Live updates on" : "Realtime ready"}
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/40 via-white to-white shadow-sm ring-1 ring-blue-100/70">
        <div className="border-b border-blue-100/80 bg-blue-50/40 px-4 py-4 sm:px-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-2.5 py-1 text-xs font-medium text-blue-800 shadow-sm">
            <FolderKanban className="size-3.5 text-blue-600" />
            Your projects
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              className="border-0 bg-transparent py-10"
              title="No projects yet"
              description="When you are invited to a project, it will show up here."
            />
          ) : activeProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              className="border-0 bg-transparent py-10"
              title="No active projects"
              description="Completed work is listed below."
            />
          ) : (
            <ul className="grid gap-2.5">
              {activeProjects.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/dashboard/projects/${item.id}`)
                    }
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-blue-700">
                          {item.title}
                        </p>
                        <ProjectStatusBadge status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        With {displayName(item.freelancer, "your contact")}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                      Open
                      <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {completedProjects.length > 0 ? (
            <div className="border-t border-zinc-100 pt-3">
              <button
                type="button"
                onClick={() => setShowCompleted((value) => !value)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-zinc-50"
                aria-expanded={showCompleted}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Completed projects
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                  {completedProjects.length}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      showCompleted && "rotate-180",
                    )}
                    aria-hidden
                  />
                </span>
              </button>
              {showCompleted ? (
                <ul className="mt-2 grid gap-2">
                  {completedProjects.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/projects/${item.id}`)
                        }
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50/30 px-3 py-2.5 text-left transition-all hover:border-zinc-300 hover:bg-white"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-zinc-700 transition-colors group-hover:text-zinc-900">
                              {item.title}
                            </p>
                            <ProjectStatusBadge status={item.status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-zinc-400">
                            {displayName(item.freelancer, "Workspace")}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-blue-700">
                          Open
                          <ArrowUpRight className="size-3" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
