// This script increases the patch version level of the info.plist in kRaw.

import path from "node:path";

import { reportableError, reportAs, runCli } from "../cli.ts";
import { kRaw } from "../fs-layout.ts";
import { gitCz, gitUpdateIndex } from "../git.ts";
import { kInfoPlist, upversionInfoPlist } from "../info-plist.ts";

runCli(async () => {
  // Ensure git index is in sync with local file timestamps
  await gitUpdateIndex();
  // Check there are no outstanding git changes on the infoPlist we are overwriting
  const diffOptions = ["--name-only", "--relative"];
  const gitDiff = async (command: string, ...args: string[]) =>
    await gitCz(kRaw, command, ...diffOptions, ...args, "--", kInfoPlist);
  const [staged, unstaged] = await Promise.all([
    gitDiff("diff-index", "--cached", "HEAD"),
    gitDiff("diff-files"),
  ]);
  const checkNo = (name: string, files: string[]) => {
    if (0 != files.length) {
      throw reportableError(
        `Cannot upversion, would overwrite ${name} file in ${kRaw}:`,
        ...files,
      );
    }
  };
  checkNo("staged", staged);
  checkNo("unstaged", unstaged);
  const rawInfoPlist = path.join(kRaw, kInfoPlist);
  await upversionInfoPlist(rawInfoPlist).catch(
    reportAs(() => `Cannot upversion ${rawInfoPlist}`),
  );
  console.log(`Bumped patch version in ${rawInfoPlist}`);
});
