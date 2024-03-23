import fs from "node:fs/promises";
import path from "node:path";

import { kDist, kInstallation, kRaw } from "./fs-layout.ts";
import { readInfoPlist, InfoPlist } from "./info-plist.ts";
import { shQuote } from "./sundry.ts";

export const distFilenames = async () => await fs.readdir(kDist);
export const installationFilenames = async () =>
  (await fs.readdir(kInstallation)).filter(
    // Pretend that prefs.plist isn't there - this is a per user configuration file.
    (name) => name !== "prefs.plist",
  );
export const rawFilenames = async () => await fs.readdir(kRaw);

const makeHelp =
  (pnpmScript: string) =>
  (options: { cd?: string[]; extra?: string[] } = {}) => {
    const cd = path.resolve(...(options.cd ?? []));
    const commands = [
      `cd ${shQuote(cd)}`,
      ...(options.extra ?? []),
      `pnpm ${pnpmScript}`,
    ];
    return `:; ( ${commands.join(" && ")} ; )`;
  };

export const helpBundleWorkflow = makeHelp("bundle-workflow");
export const helpExportWorkflow = makeHelp("export-workflow");
export const helpImportWorkflow = makeHelp("import-workflow");
export const helpLinkWorkflow = makeHelp("link-workflow");
export const helpUpdateWorkflow = makeHelp("update-workflow");

export const verifyBundleid = async (
  thisDir: string,
  thisInfoPlist: InfoPlist,
  thatDir: string,
) => {
  const thatInfoPlist = await readInfoPlist(thatDir);
  const thisBundleid = thisInfoPlist.bundleid;
  const thatBundleid = thatInfoPlist.bundleid;
  if (thisBundleid !== thatBundleid) {
    throw new Error(
      `${thisDir} bundleid ${thisBundleid} != ${thatDir} bundleid ${thatBundleid}`,
    );
  }
  return thatInfoPlist;
};
