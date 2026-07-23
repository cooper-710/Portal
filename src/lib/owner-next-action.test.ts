import { describe, expect, it } from "vitest";

import { pickOwnerNextAction } from "@/lib/owner-next-action";

function project(status: "in_progress" | "completed") {
  return {
    id: "project-1",
    freelancer_id: "owner-1",
    client_id: "client-1",
    client_email: "client@example.test",
    title: "Project",
    status,
    created_at: "2026-07-23T01:00:00.000Z",
    updated_at: "2026-07-23T01:00:00.000Z",
  };
}

describe("owner next action", () => {
  it("prioritizes client change requests", () => {
    const action = pickOwnerNextAction(
      [project("in_progress")],
      [],
      [{
        project_id: "project-1",
        review_status: "changes_requested",
        feedback_reviewed_at: null,
        feedback_resolved_at: null,
      }],
    );
    expect(action.title).toContain("Review");
    expect(action.href).toContain("project-1");
  });

  it("offers upload or completion after feedback is reviewed", () => {
    const action = pickOwnerNextAction(
      [project("in_progress")],
      [],
      [{
        project_id: "project-1",
        review_status: "changes_requested",
        feedback_reviewed_at: "2026-07-23T02:00:00.000Z",
        feedback_resolved_at: null,
      }],
    );
    expect(action.title).toContain("Respond");
    expect(action.description).toContain("complete the project");
  });

  it("does not resurface resolved or completed-project feedback", () => {
    const action = pickOwnerNextAction(
      [project("completed")],
      [],
      [{
        project_id: "project-1",
        review_status: "changes_requested",
        feedback_reviewed_at: "2026-07-23T02:00:00.000Z",
        feedback_resolved_at: null,
      }],
    );
    expect(action.title).toBe("Start the next project");
  });

  it("gives an empty workspace one clear starting action", () => {
    expect(pickOwnerNextAction([], [], []).label).toBe("Create project");
  });
});
