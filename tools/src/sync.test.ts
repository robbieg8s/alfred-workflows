import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { syncOutcomes, SyncAction } from "./sync.ts";

const testSource = "test/data/sync/source";
const testTarget = "test/data/sync/target";

const testFile = "file";
const testLinkSource = "link-source";
const testLinkTarget = "link-target";
const testSourceMissing = "source-missing";
const testTargetMissing = "target-missing";

const testNames = [
  testFile,
  testLinkSource,
  testLinkTarget,
  testSourceMissing,
  testTargetMissing,
];

describe("syncOutcomes", () => {
  it("reports outcomes", async () => {
    // Set timestamps on the common file to be equal for first test
    const now = new Date();
    await fs.utimes(path.join(testSource, testFile), now, now);
    await fs.utimes(path.join(testTarget, testFile), now, now);
    const actualOutcomes = await syncOutcomes(
      testSource,
      testTarget,
      testNames,
    );
    const expectedOutcomes = [
      { name: testFile, action: SyncAction.None },
      { name: testLinkSource, action: SyncAction.Fail },
      { name: testLinkTarget, action: SyncAction.Fail },
      { name: testSourceMissing, action: SyncAction.Delete },
      { name: testTargetMissing, action: SyncAction.Copy },
    ];
    expectedOutcomes.forEach((expectedOutcome) => {
      const matchingActualOutcomes = actualOutcomes.filter(
        ({ name }) => expectedOutcome.name === name,
      );
      assert.equal(matchingActualOutcomes.length, 1);
      const [actualOutcome] = matchingActualOutcomes;
      assert.equal(actualOutcome.action, expectedOutcome.action);
      if (expectedOutcome.action === SyncAction.Fail) {
        assert.ok("reason" in actualOutcome);
      }
    });
    assert.equal(actualOutcomes.length, expectedOutcomes.length);
  });

  it("respects ignores", async () => {
    // the ignores parameter says "if it's missing from target that's fine"
    const actualOutcomes = await syncOutcomes(
      testSource,
      testTarget,
      [testTargetMissing],
      new Set([testTargetMissing]),
    );
    const expectedOutcomes = [
      { name: testTargetMissing, action: SyncAction.None },
    ];
    assert.deepEqual(actualOutcomes, expectedOutcomes);
  });

  it("copies newer source over older target", async () => {
    const now = new Date();
    await fs.utimes(path.join(testSource, testFile), now, now);
    // Move target back a second
    const older = new Date(now.getTime() - 1000);
    await fs.utimes(path.join(testTarget, testFile), older, older);
    const actualOutcomes = await syncOutcomes(testSource, testTarget, [
      testFile,
    ]);
    const expectedOutcomes = [{ name: testFile, action: SyncAction.Copy }];
    assert.deepEqual(actualOutcomes, expectedOutcomes);
  });

  it("fails to copy older source over newer target", async () => {
    const now = new Date();
    await fs.utimes(path.join(testTarget, testFile), now, now);
    // Move source back a second
    const older = new Date(now.getTime() - 1000);
    await fs.utimes(path.join(testSource, testFile), older, older);
    // the ignores parameter says "if it's missing from target that's fine"
    const actualOutcomes = await syncOutcomes(testSource, testTarget, [
      testFile,
    ]);
    assert.equal(actualOutcomes.length, 1);
    const [actualOutcome] = actualOutcomes;
    assert.equal(actualOutcome.name, testFile);
    assert.equal(actualOutcome.action, SyncAction.Fail);
    assert.ok("reason" in actualOutcome);
  });
});
