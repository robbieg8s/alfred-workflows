// This cross-checks info.plist and package.json constants, and is
// intended to check more in the future. It's possible that adding fix
// options might be worth it one day. It is intended for semantic checks
// beyond the scope of eslint (or maybe it should be an eslint plugin?).

import fs from "node:fs/promises";

import { reportableError, runCli } from "../cli.ts";
import { kRaw } from "../fs-layout.ts";
import { readInfoPlist } from "../info-plist.ts";
import { isJsonObject, isJsonString, jsonParse, jsonTypeOf } from "../json.js";
import { packageName } from "../workflow.js";

runCli(async () => {
  const [infoPlist, packageJson] = await Promise.all([
    readInfoPlist(kRaw),
    fs.readFile("package.json", "utf8").then(jsonParse),
  ]);
  const listProblems = () => {
    if (!isJsonObject(packageJson)) {
      return ["Cannot parse package.json"];
    } else {
      const checkField = (field: string, expected?: string) => {
        const value = packageJson[field];
        if (undefined === value) {
          return [`Missing '${field}' in package.json`];
        } else if (!isJsonString(value)) {
          return [
            `Field '${field}' in package.json is ${jsonTypeOf(value)} != string`,
          ];
        } else if (undefined === expected) {
          return [
            `Field '${field}' in package.json cannot be inferred from info.plist, check Alfred configuration`,
          ];
        } else if (value !== expected) {
          return [
            `Field '${field}' in package.json "${value}" != "${expected}" inferred from info.plist`,
          ];
        } else {
          // Fine! No Problem!
          return [];
        }
      };
      return [
        ...checkField("name", packageName(infoPlist.repositoryName())),
        ...checkField("version", infoPlist.version),
        ...checkField("description", infoPlist.description),
        ...checkField("author", infoPlist.createdby),
      ];
    }
  };
  const problems = listProblems();
  const problemCount = problems.length;
  if (0 !== problemCount) {
    throw reportableError(
      `Lint failed - found ${problemCount} problem(s):`,
      ...problems,
    );
  } // else all good!
});
