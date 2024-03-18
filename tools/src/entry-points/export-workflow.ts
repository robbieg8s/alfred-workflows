// This script converts an assembled workflow from kDist into the Alfred
// installable .alfredworkflow file.  This assume bundle-workflow has been run
// to prepare kDist.

import path from "node:path";

import { runCli, reportAs } from "../cli.ts";
import { kDist } from "../fs-layout.ts";
import { readInfoPlist } from "../info-plist.ts";
import { arrayBufferToString, ProcessBuilder } from "../sundry.ts";
import { distFilenames } from "../workflow.ts";

runCli(async () => {
  // Use the kDist info.plist - in future it might be generated.
  const infoPlist = await readInfoPlist(kDist).catch(
    reportAs(() => `Cannot read ${kDist}/info.plist`),
  );
  const zipStdout = await new ProcessBuilder(
    "zip",
    path.join("..", infoPlist.exportName()),
    ...(await distFilenames()),
  )
    .withCwd(kDist)
    .run()
    .catch(reportAs(() => "Cannot exec zip to assemble .Alfred"));
  console.log(arrayBufferToString(zipStdout));
});
