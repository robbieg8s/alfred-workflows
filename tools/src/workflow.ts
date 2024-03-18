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

const helpShCommand = (pnpmScript: string) =>
  `:; ( cd ${shQuote(path.resolve())} && pnpm ${pnpmScript}; )`;

export const helpBundleWorkflow = () => helpShCommand("bundle-workflow");
export const helpExportWorkflow = () => helpShCommand("export-workflow");
export const helpImportWorkflow = () => helpShCommand("import-workflow");
export const helpLinkWorkflow = () => helpShCommand("link-workflow");
export const helpUpdateWorkflow = () => helpShCommand("update-workflow");

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
