// This script copies files from kDist to the live workflow linked via kInstallation.
// This assume link-workflow has been run to prepare kInstallation, and bundle-workflow has been run to prepare kDist.

import fs from "node:fs/promises";
import path from "node:path";

import { runCli, reportableError, reportAs } from "../cli.ts";
import { kInstallation, kDist } from "../fs-layout.ts";
import { readInfoPlist } from "../info-plist.ts";
import { shQuote } from "../sundry.ts";
import { syncOutcomes, SyncAction } from "../sync.ts";
import {
  distFilenames,
  installationFilenames,
  helpBundleWorkflow,
  helpImportWorkflow,
  helpLinkWorkflow,
  verifyBundleid,
} from "../workflow.ts";

const verifySymlink = (
  path: string,
  lstat: { mode: number | bigint; isSymbolicLink: () => boolean },
) => {
  if (!lstat.isSymbolicLink()) {
    throw reportableError(
      `Expected ${path} to be a symlink, but it's not (mode = octal ${lstat.mode.toString(8)})`,
    );
  }
};

runCli(async () => {
  const installationInfoPlist = await readInfoPlist(kInstallation, {
    // Without the kInstallation link, this script can't do it's job
    noDir: (path: string) => {
      throw reportableError(
        `Can't update-workflow without ${path} link - run link-workflow?`,
        helpLinkWorkflow(),
      );
    },
    // Since we had to stat it anyway, may as well do this helpful check
    dirStat: verifySymlink,
    // We found the link as expected, but something else went wrong reading or
    // parsing the plist.  This might just be a corrupted info.plist, which can
    // happen during development, so pass undefined to the script to handle
    // this.
    noFile: () => undefined,
    corruptXml: () => undefined,
    missingField: () => undefined,
  });
  if (undefined === installationInfoPlist) {
    // Missing info.plist, corrupt XML or XSLT failed, missing fields in
    // info.plist Warn, but push on.  This handling is a bit of a tradeoff, but
    // i think it's the right dev tradeoff, unless we wanted to start adding
    // --force options etc.
    console.log(
      `WARNING: Ignoring missing or corrupted ${kInstallation}/info.plist`,
    );
  } else {
    // kInstallation infoPlist is present and not corrupted (since it didn't
    // throw), so do a bundleid check. Check against kDist, because that's what
    // we're going to copy over.  Be strict about distInfoPlist - if it's
    // broken, probably we need to bundle-workflow again.
    await verifyBundleid(kInstallation, installationInfoPlist, kDist).catch(
      reportAs(
        () =>
          `Cannot verify bundleid match - you may need to bundle-workflow or link-workflow?`,
        () => [helpBundleWorkflow(), helpLinkWorkflow()],
      ),
    );
  }

  // Bundleids match, or installation is empty/corrupted

  // Next, check if kInstallation has anything we don't expect, or newer than
  // our kDist, and fail if so - this is a basic protection against a common
  // failure mode during development.  Determine what a sync from kDist to
  // kInstallation would do
  const outcomes = await syncOutcomes(kDist, kInstallation, [
    ...new Set([
      ...(await distFilenames()),
      ...(await installationFilenames()),
    ]),
  ]);
  const failures = outcomes
    .filter(({ action }) => action === SyncAction.Fail)
    .map(({ name, reason }) => `  ${name}: ${reason}`);
  if (0 != failures.length) {
    throw reportableError(
      `Cannot update-workflow, ${failures.length} problems with sync ${kDist} -> ${kInstallation}:`,
      ...failures,
    );
  }
  // Flag deletes as a problem because we don't want to delete files possibly
  // created by Alfred (or the user via the Alfred UI). Stale files shouldn't do
  // much damage to a running workflow, and we offer the command to remove them.
  // Otherwise the next import-workflow will copy them to kRaw, and the user can
  // integrate them into the git controlled source.
  const deletes = outcomes
    .filter(({ action }) => action === SyncAction.Delete)
    .map(({ name }) => `:; rm ${shQuote(path.resolve(kInstallation, name))}`);
  if (0 != deletes.length) {
    throw reportableError(
      `Cannot update-workflow, found ${deletes.length} stale files in ${kInstallation}`,
      `  Either import-workflow, resolve, and then bundle-workflow before retrying:`,
      helpImportWorkflow(),
      helpBundleWorkflow(),
      `  Or delete the files you don't want:`,
      ...deletes,
    );
  }

  // There are no SyncAction.{Fail, Delete}, we don't care about
  // SyncAction.None, so all that's left is to copy each SyncAction.Copy
  // outcome.  Empirically, the mode (in the sense of chmod) is preserved by
  // this copy, which is what we want.
  const copies = await Promise.all(
    outcomes
      .filter(({ action }) => action === SyncAction.Copy)
      .map(async ({ name }) => {
        const source = path.join(kDist, name);
        const target = path.join(kInstallation, name);
        await fs.cp(source, target, { preserveTimestamps: true });
        return `${target} updated from ${source}`;
      }),
  );
  copies.forEach((copy) => console.log(copy));
});
