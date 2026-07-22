"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { ProjectPhaseSelector } from "@/components/dashboard/project-phase-selector";
import { ProjectStatusBadge } from "@/components/dashboard/status-badge";
import type { FreelancerProject } from "@/lib/dashboard-data";
import { isCompletedProject, displayName, projectClientLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

type FreelancerProjectsPageProps = {
  profile: Profile;
  projects: FreelancerProject[];
};

export function FreelancerProjectsPage({
  profile,
  projects,
}: FreelancerProjectsPageProps) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const activeProjects = projects.filter(
    (project) => !isCompletedProject(project.status),
  );
  const completedProjects = projects.filter((project) =>
    isCompletedProject(project.status),
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Workspace
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
        <NewProjectDialog
          onCreated={(result) => {
            setMessage(
              result?.inviteSent
                ? "Project created and invite emailed to the client."
                : "Project created.",
            );
            router.refresh();
          }}
        />
      </div>

      {message ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-900">
          {message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
            <FolderKanban className="size-3.5 text-zinc-500" />
            Active projects
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              className="border-0 bg-transparent py-10"
              title="No projects yet"
              description="Create a project and invite a client by email."
              action={
                <NewProjectDialog
                  onCreated={() => {
                    router.refresh();
                  }}
                />
              }
            />
          ) : activeProjects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              className="border-0 bg-transparent py-10"
              title="No active projects"
              description="Completed work lives below. Create a new project to get started."
              action={<NewProjectDialog onCreated={() => router.refresh()} />}
            />
          ) : (
            <ul className="grid gap-2.5">
              {activeProjects.map((project) => {
                const clientLabel = projectClientLabel(
                  project.client,
                  project.client_email,
                );

                return (
                  <li
                    key={project.id}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3.5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/projects/${project.id}`)
                      }
                      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-blue-700">
                              {project.title}
                            </p>
                            <ProjectStatusBadge status={project.status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {clientLabel}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                          Open
                          <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </span>
                      </div>
                    </button>
                    <div className="mt-3 border-t border-zinc-200/70 pt-3">
                      <ProjectPhaseSelector
                        projectId={project.id}
                        status={project.status}
                        compact
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {completedProjects.length > 0 ? (
            <div className="mt-4 border-t border-zinc-100 pt-3">
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
                  {completedProjects.map((project) => {
                    const clientLabel = projectClientLabel(
                      project.client,
                      project.client_email,
                    );

                    return (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/dashboard/projects/${project.id}`)
                          }
                          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50/30 px-3 py-2.5 text-left transition-all hover:border-zinc-300 hover:bg-white"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-zinc-700 transition-colors group-hover:text-zinc-900">
                                {project.title}
                              </p>
                              <ProjectStatusBadge status={project.status} />
                            </div>
                            <p className="mt-0.5 truncate text-xs text-zinc-400">
                              {clientLabel}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-blue-700">
                            Open
                            <ArrowUpRight className="size-3" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
