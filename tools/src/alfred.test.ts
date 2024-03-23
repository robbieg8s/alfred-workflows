import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { currentWorkflowsRoot, listWorkflows } from "./alfred.ts";

describe("currentWorkflowsRoot", () => {
  it("extracts current", async () => {
    const workflowsRoot = await currentWorkflowsRoot(
      "./test/data/alfred/prefs.json",
    );
    assert.equal(workflowsRoot, "example-workflows-root/workflows");
  });
});

describe("listWorkflows", () => {
  it("lists workflows", async () => {
    const { workflows, warnings } = await listWorkflows(
      "./test/data/info-plist",
    );
    assert.equal(workflows.length, 1);
    assert.equal(warnings.length, 2);
  });
});
