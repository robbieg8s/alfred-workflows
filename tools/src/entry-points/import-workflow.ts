// This script copies newer files from kInstallation to kRaw, and warns about
// files that exist in neither kDist nor kRaw. It enables a developer to pull
// edits made in the Alfred UI back to the repository.

import fs from "node:fs/promises";
import path from "node:path";

import { runCli, reportAs, reportableError } from "../cli.ts";
import { kInstallation, kRaw } from "../fs-layout.ts";
import { splitArrayBufferOn, ProcessBuilder } from "../sundry.ts";
import { syncOutcomes, SyncAction } from "../sync.ts";
import { readInfoPlist, verifySymlink } from "../info-plist.ts";
import {
  distFilenames,
  helpBundleWorkflow,
  helpExportWorkflow,
  helpLinkWorkflow,
  installationFilenames,
  rawFilenames,
  verifyBundleid,
} from "../workflow.ts";

runCli(async () => {
  const installationInfoPlist = await readInfoPlist(kInstallation, {
    // If kInstallation is missing, offer specific help
    noDir: () => {
      throw reportableError(
        `No ${kInstallation} link and it is required to import-workflow - run link-workflow?`,
        helpLinkWorkflow(),
      );
    },
    // If kInstallation isn't a symlink, something is wrong.
    dirStat: verifySymlink,
    // All other error cases can convert to exceptions
  }).catch(
    reportAs(
      () =>
        `Problems with ${kInstallation}/info.plist, run bundle-workflow and/or export-workflow?`,
      () => [helpBundleWorkflow(), helpExportWorkflow()],
    ),
  );
  // Do a bundleid check
  await verifyBundleid(kInstallation, installationInfoPlist, kRaw).catch(
    reportAs(
      () =>
        `${kInstallation} does not appear linked correctly - run link-workflow?`,
      () => [helpLinkWorkflow()],
    ),
  );

  // Figure out what needs to be updated by import
  const outcomes = await syncOutcomes(
    kInstallation,
    kRaw,
    // We're going to copy from kInstallation to kRaw, but we want to ignore
    // things that come from kDist, and to implement this we need information
    // about both ends of the sync.
    [
      ...new Set([
        ...(await installationFilenames()),
        ...(await rawFilenames()),
      ]),
    ],
    // We ignore files in kDist - meaning that if sync sees a file missing in
    // kRaw it won't ask to copy it, because actually the file in kInstallation
    // comes from kDist, not kRaw. If this is wrong, the next bundle-workflow
    // will see it as a clash and we can resolve then without losing data.
    new Set(await distFilenames()),
  );

  const failActions = outcomes.filter(
    ({ action }) => action === SyncAction.Fail,
  );
  const failCount = failActions.length;
  if (0 != failCount) {
    throw reportableError(
      `Cannot import-workflow, ${failCount} problems with sync:`,
      // reason is typed string | undefined here, but it won't be undefined for
      // failActions as syncOutcomes fills it in for these cases. Since we only
      // use reason for UX, it doesn't seem worth the type gyrations to get the
      // typescript compiler to understand this. The first time i get a bug from
      // forgetting to set reason i'll reconsider this.
      ...failActions.map(({ name, reason }) => `  ${name}: ${reason}`),
    );
  }

  // No actions are SyncAction.Fail, filter down to changes
  const changeActions = outcomes.filter(
    ({ action }) => action !== SyncAction.None,
  );
  if (0 == changeActions.length) {
    // We need to special case this, because the git checks flag all files if we
    // give them no file arguments. Since we're here, print a helpful message.
    console.log("All files imported and up to date");
  } else {
    // Check that anything that would result in change is reversible using git
    const git = async (...args: string[]) =>
      await new ProcessBuilder("git", ...args).run();
    // The git commands we use inspect the index, and since we've possibly
    // messed with timestamps, we need to refresh before we keep going, but we
    // don't care about the state from the command, hence the -q
    await git("update-index", "-q", "--refresh");
    const gitFiles = changeActions.map(({ name }) => name);
    const diffOptions = ["--name-only", "--relative"];
    const gitResponses = (
      await Promise.all(
        [
          ["staged", "diff-index", ...diffOptions, "--cached", "HEAD"],
          ["unstaged", "diff-files", ...diffOptions],
          ["untracked", "ls-files", "--others", "--exclude-standard"],
        ].map(async ([kind, command, ...args]) => ({
          kind,
          out: await git("-C", kRaw, command, "-z", ...args, "--", ...gitFiles),
        })),
      )
    ).map(({ kind, out }) => ({ kind, files: splitArrayBufferOn(out, 0) }));
    const gitProblems = gitResponses.flatMap(({ kind, files }) => {
      const filesCount = files.length;
      return 0 === filesCount
        ? []
        : [
            `Following ${filesCount} files are ${kind} in git:`,
            ...files.map((file) => `  ${file}`),
          ];
    });
    if (0 !== gitProblems.length) {
      const changeMap = new Map(
        changeActions.map(({ name, action }) => [name, action]),
      );
      throw reportableError(
        "Cannot Import",
        ...gitProblems,
        "and so cannot perform actions:",
        ...[...new Set(gitResponses.flatMap(({ files }) => files))]
          .toSorted()
          .map((name) => {
            const action = changeMap.get(name);
            return `  ${name}: ${action !== undefined ? SyncAction[action] : "???"}`;
          }),
      );
    }

    // Ok, anything we are going to overwrite or remove is safely saved in git,
    // so we can go ahead with the sync, and use git diff to analyze after.
    const results = await Promise.all(
      changeActions.map(async ({ name, action }) => {
        const target = path.join(kRaw, name);
        switch (action) {
          case SyncAction.Copy: {
            const source = path.join(kInstallation, name);
            await fs.cp(source, target, { preserveTimestamps: true });
            return `${target} updated from ${source}`;
          }
          case SyncAction.Delete: {
            await fs.rm(target);
            return `${target} deleted`;
          }
          default: {
            // This should be unreachable based on the filtering above.
            throw new Error(
              `Internal error: unexpected ${action} syncing ${target}`,
            );
          }
        }
      }),
    );
    results.forEach((result) => console.log(result));
  }
});
