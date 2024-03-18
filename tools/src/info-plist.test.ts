import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { readInfoPlist } from "./info-plist.ts";

const testData = (name: string) => path.join("test/data/info-plist", name);

describe("readInfoPlist default options", () => {
  it("parses a basic info.plist", async () => {
    const infoPlist = await readInfoPlist(testData("example"));
    assert.equal(infoPlist.bundleid, "org.halfyak.alfredapp.example-workflow");
    assert.equal(infoPlist.name, "Example Name");
    assert.equal(infoPlist.version, undefined);
  });
  it("throws for corrupt xml", async () => {
    assert.rejects(async () => await readInfoPlist(testData("corrupt-xml")));
  });
  it("throws for missing fields", async () => {
    assert.rejects(async () => await readInfoPlist(testData("missing-field")));
  });
});

describe("readInfoPlist with options", () => {
  it("returns undefined for corrupt xml when configured", async () => {
    const infoPlist = await readInfoPlist(testData("corrupt-xml"), {
      corruptXml: () => undefined,
    });
    assert.equal(infoPlist, undefined);
  });
  it("returns undefined for missing fields when configured", async () => {
    const infoPlist = await readInfoPlist(testData("missing-field"), {
      missingField: () => undefined,
    });
    assert.equal(infoPlist, undefined);
  });
});
