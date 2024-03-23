import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { helpImportWorkflow } from "./workflow.ts";

// We test helpImportWorkflow because its exposed and used by bootstrap-workflow
// nontrivially. We are resting on the fact that all the help... functions use
// the same implementation.
describe("helpImportWorkflow", () => {
  // These tests assume we're running in a directory which has no 's in its
  // path. This could be fixed at the cost of some test transparency.
  it("works for default arguments", () => {
    assert.equal(
      helpImportWorkflow(),
      `:; ( cd '${process.cwd()}' && pnpm import-workflow ; )`,
    );
  });
  it("permits path to be set", () => {
    assert.equal(
      helpImportWorkflow({ cd: ["hello", "world"] }),
      `:; ( cd '${process.cwd()}/hello/world' && pnpm import-workflow ; )`,
    );
  });
  it("permits extra commands to be included", () => {
    assert.equal(
      helpImportWorkflow({ extra: ["hello $world", "pnpm install"] }),
      `:; ( cd '${process.cwd()}' && hello $world && pnpm install && pnpm import-workflow ; )`,
    );
  });
});
