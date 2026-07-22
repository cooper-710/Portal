"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { updateProjectPhase } from "@/app/actions";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PROJECT_PHASES, type ProjectPhase, type ProjectStatus } from "@/types/database";

function toPhase(status: ProjectStatus): ProjectPhase {
  switch (status) {
    case "draft":
      return "discovery";
    case "active":
      return "in_progress";
    case "in_review":
      return "review";
    case "archived":
      return "completed";
    case "discovery":
    case "in_progress":
    case "review":
    case "completed":
      return status;
    default:
      return "discovery";
  }
}

export function ProjectPhaseSelector({
  projectId,
  status,
  compact = false,
}: {
  projectId: string;
  status: ProjectStatus;
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ProjectPhase>(toPhase(status));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValue(toPhase(status));
  }, [status]);

  function onChange(next: ProjectPhase) {
    setValue(next);
    setError(null);

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("status", next);

    startTransition(async () => {
      const result = await updateProjectPhase(formData);
      if (result?.error) {
        setError(result.error);
        setValue(toPhase(status));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`project-phase-${projectId}`} className="text-xs text-muted-foreground">
        Project phase
      </Label>
      <div className="relative">
        <NativeSelect
          id={`project-phase-${projectId}`}
          value={value}
          disabled={pending}
          onChange={(event) => onChange(event.target.value as ProjectPhase)}
          className="h-10 font-medium"
        >
          {PROJECT_PHASES.map((phase) => (
            <option key={phase.value} value={phase.value}>
              {phase.label}
            </option>
          ))}
        </NativeSelect>
        {pending ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-zinc-400" />
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!compact ? (
        <p className="text-xs text-muted-foreground">
          Clients see this phase update live on their dashboard.
        </p>
      ) : null}
    </div>
  );
}
