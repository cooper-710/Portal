import { describe, expect, it } from "vitest";

import { pickOwnerNextAction } from "@/lib/owner-next-action";

describe("owner next action", () => {
  it("prioritizes client change requests", () => {
    const action = pickOwnerNextAction([], [], [{ project_id: "project-1", review_status: "changes_requested" }]);
    expect(action.title).toContain("Revise");
    expect(action.href).toContain("project-1");
  });

  it("gives an empty workspace one clear starting action", () => {
    expect(pickOwnerNextAction([], [], []).label).toBe("Create project");
  });
});
