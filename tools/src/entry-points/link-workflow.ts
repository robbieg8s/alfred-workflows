// This script creates a kInstallation symlink to map directories for import-workflow and update-workflow

import fs from "node:fs/promises";
import path from "node:path";

import { listCurrentWorkflows } from "../alfred.ts";
import { runCli, reportableError, reportAs } from "../cli.ts";
import { kInstallation, kRaw } from "../fs-layout.ts";
import { readInfoPlist, verifySymlink } from "../info-plist.ts";
import { shQuote } from "../sundry.ts";
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
    const { workflows, warnings } = await listCurrentWorkflows();
    // Notify but ignore bad workflows
    warnings.forEach((warning) => console.log(warning));

    // Fetch the kRaw bundleid we are matching against.
    const rawInfoPlist = await readInfoPlist(kRaw);

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
