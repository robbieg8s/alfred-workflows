// This script creates a kInstallation symlink to map directories for import-workflow and update-workflow

import fs from "node:fs/promises";
import path from "node:path";

import { runCli, reportableError, reportAs } from "../cli.ts";
import { kInstallation, kRaw } from "../fs-layout.ts";
import { jsonParse, jsonTypeOf, toJsonObject, toJsonString } from "../json.ts";
import { readInfoPlist, verifySymlink } from "../info-plist.ts";
import { encatchulate, partition, shQuote } from "../sundry.ts";
import {
  helpLinkWorkflow,
  helpUpdateWorkflow,
  verifyBundleid,
} from "../workflow.ts";

const helpRemoveRelink = () => [
  `:; rm -f ${shQuote(path.resolve(kInstallation))}`,
  helpLinkWorkflow(),
];

runCli(async () => {
  const installationInfoPlist = await readInfoPlist(kInstallation, {
    // If kInstallation is missing, that's fine
    noDir: () => undefined,
    // If kInstallation is present and isn't a symlink, something is wrong.
    dirStat: verifySymlink,
    // All other error cases can convert to exceptions
  }).catch(
    reportAs(
      () =>
        "The linked workflow is corrupted ? Try update, or maybe remove and relink?",
      // We only get here if we can read the installationInfoPlist, which checks
      // kInstallation is a symlink, so this rm is only going to rm a symlink.
      () => [helpUpdateWorkflow(), ...helpRemoveRelink()],
    ),
  );
  if (installationInfoPlist !== undefined) {
    const rawInfoPlist = await verifyBundleid(
      kInstallation,
      installationInfoPlist,
      kRaw,
    ).catch(
      reportAs(
        () =>
          "It looks like this workflow is linked to the wrong installation, maybe remove and relink?",
        helpRemoveRelink,
      ),
    );
    // Use the rawInfoPlist here - even thought the bundleids match, in a bad
    // copy/paste scenario, it may be useful to present the extra information.
    console.log(
      `Confirmed linked installation matches bundleid for ${rawInfoPlist.describe()}`,
    );
  } else {
    // Find and link the matching workflow

    // We need to search through some Alfred configuration to find the workflows
    const envHome = process.env["HOME"];
    if (undefined === envHome) {
      throw reportableError("Environment variable 'HOME' is not set");
    }
    const alfredPrefsFile = path.join(
      envHome,
      "Library/Application Support/Alfred/prefs.json",
    );
    const alfredPrefsData = await fs
      .readFile(alfredPrefsFile)
      .catch(reportAs(() => `Cannot read ${alfredPrefsFile}`));
    const alfredPrefsJson = await encatchulate(
      jsonParse,
      alfredPrefsData.toString(),
    ).catch(reportAs(() => `Failed to parse JSON from ${alfredPrefsFile}`));
    const alfredPrefs = toJsonObject(alfredPrefsJson);
    if (undefined === alfredPrefs) {
      throw reportableError(
        `Cannot parse ${alfredPrefsFile} to a JSON object, found ${jsonTypeOf(alfredPrefsJson)}`,
      );
    }
    const alfredPrefsCurrent = alfredPrefs["current"];
    if (undefined === alfredPrefsCurrent) {
      throw reportableError(
        `Failed to parse "current" from ${alfredPrefsFile}`,
      );
    }
    const alfredPrefsCurrentString = toJsonString(alfredPrefsCurrent);
    if (undefined === alfredPrefsCurrentString) {
      throw reportableError(
        `Property 'current' from ${alfredPrefsFile} was ${jsonTypeOf(alfredPrefsCurrent)} != string as expected`,
      );
    }
    const alfredWorkflowsRoot = path.join(
      alfredPrefsCurrentString,
      "workflows",
    );

    const [fulfilled, rejected] = partition(
      await Promise.allSettled(
        (await fs.readdir(alfredWorkflowsRoot))
          .map((dirName) => path.join(alfredWorkflowsRoot, dirName))
          .map(async (target) => ({
            target,
            infoPlist: await readInfoPlist(target),
          })),
      ),
      ({ status }) => status === "fulfilled",
    );
    // Notify but ignore bad workflows - we are relying on good exception text
    // from the errors
    rejected.forEach((settled) => {
      // Help the typechecker out, without accidentally suppressing errors
      const reason = "rejected" === settled.status ? settled.reason : settled;
      console.log(`WARNING: ignoring corrupted workflow: ${reason}`);
    });

    // Fetch the kRaw bundleid we are matching against.
    const rawInfoPlist = await readInfoPlist(kRaw);

    const fulfilledValue = <T>(settled: PromiseSettledResult<T>) => {
      if (settled.status === "fulfilled") {
        return settled.value;
      } else {
        throw new Error(
          `Cannot request value from ${settled.status} Promise: ${settled.reason}`,
        );
      }
    };

    const workflows = fulfilled.map(fulfilledValue);
    const matching = workflows.filter(
      ({ infoPlist }) => infoPlist.bundleid === rawInfoPlist.bundleid,
    );
    const count = matching.length;
    if (0 === count) {
      throw reportableError(
        "Cannot find a matching installed workflow, use export-workflow to build, install via Alfred, and retry link",
        `:; (cd ${shQuote(path.resolve())} && pnpm export-workflow && open ${shQuote(rawInfoPlist.exportName())})`,
      );
    }
    if (1 !== count) {
      throw reportableError(
        "Found multiple matching workflows, you might need to clean up the duplicates in Alfred?",
        ...matching.map(
          ({ target, infoPlist }) =>
            `Found ${infoPlist.describe()} in ${target}`,
        ),
      );
    }

    // Unique choice left, so link it
    const [{ target, infoPlist }] = matching;
    await fs
      .symlink(target, kInstallation)
      .catch(reportAs(() => `Failed to create symlink ${kInstallation}`));
    console.log(`Linked to ${infoPlist.describe()} in ${target}`);
  }
});
