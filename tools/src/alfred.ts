// Utilities for Alfred workflow management

import fs from "node:fs/promises";
import path from "node:path";

import { reportableError, reportAs } from "./cli.ts";
import { readInfoPlist } from "./info-plist.ts";
import { jsonParse, jsonTypeOf, toJsonObject, toJsonString } from "./json.ts";
import { encatchulate, getEnvOrThrow, partition } from "./sundry.ts";

export const prefsPath = () =>
  path.join(
    getEnvOrThrow("HOME"),
    "Library/Application Support/Alfred/prefs.json",
  );

/**
 * Parse Alfred's preferences to find the root of the workflows.
 */
export const currentWorkflowsRoot = async (prefsPath: string) => {
  const prefsData = await fs
    .readFile(prefsPath)
    .catch(reportAs(() => `Cannot read ${prefsPath}`));
  const prefsJson = await encatchulate(jsonParse, prefsData.toString()).catch(
    reportAs(() => `Failed to parse JSON from ${prefsPath}`),
  );
  const prefs = toJsonObject(prefsJson);
  if (undefined === prefs) {
    throw reportableError(
      `Cannot parse ${prefsPath} to a JSON object, found ${jsonTypeOf(prefsJson)}`,
    );
  }
  const prefsCurrent = prefs["current"];
  if (undefined === prefsCurrent) {
    throw reportableError(`Failed to parse "current" from ${prefsPath}`);
  }
  const prefsCurrentString = toJsonString(prefsCurrent);
  if (undefined === prefsCurrentString) {
    throw reportableError(
      `Property 'current' from ${prefsPath} was ${jsonTypeOf(prefsCurrent)} != string as expected`,
    );
  }
  return path.join(prefsCurrentString, "workflows");
};

/**
 * Parse all workflows in a directory and return those that can be parsed and
 * a list of warnings for failures.
 */
export const listWorkflows = async (workflowsRoot: string) => {
  const [fulfilled, rejected] = partition(
    await Promise.allSettled(
      (await fs.readdir(workflowsRoot))
        .map((dirName) => path.join(workflowsRoot, dirName))
        .map(async (target) => ({
          target,
          infoPlist: await readInfoPlist(target),
        })),
    ),
    ({ status }) => status === "fulfilled",
  );
  // We are relying on good exception text from the errors
  const warnings = rejected.map((settled) => {
    // Help the typechecker out, without accidentally suppressing errors
    const reason = "rejected" === settled.status ? settled.reason : settled;
    return `WARNING: ignoring corrupted workflow: ${reason}`;
  });

  const fulfilledValue = <T>(settled: PromiseSettledResult<T>) => {
    if (settled.status === "fulfilled") {
      return settled.value;
    } else {
      throw new Error(
        `Cannot request value from ${settled.status} Promise: ${settled.reason}`,
      );
    }
  };

  return { workflows: fulfilled.map(fulfilledValue), warnings };
};

export const listCurrentWorkflows = async () =>
  await listWorkflows(await currentWorkflowsRoot(prefsPath()));
