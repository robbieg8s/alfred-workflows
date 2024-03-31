// This script sets up new source controlled directory for an Alfred workflow by
// importing an existing workflow.

import fs from "node:fs/promises";
import path from "node:path";

import { listCurrentWorkflows } from "../alfred.ts";
import { reportAs, runCli } from "../cli.ts";
import { kInstallation, kRaw } from "../fs-layout.ts";
import { kInfoPlist, readInfoPlist } from "../info-plist.ts";
import { helpImportWorkflow } from "../workflow.ts";

import templatePackageJson from "../template-package.json";
import templateTsconfigJson from "../template-tsconfig.json";

runCli(async () => {
  // The repository subdirectory for the workflows
  const kWorkflows = "workflows";
  // Find the workflows we already have. Use bundleid from kRaw, because we want
  // don't want to assume all workflows are installed.
  const sourceBundleids = new Set(
    await Promise.all(
      (await fs.readdir(kWorkflows)).map(
        async (workflowDir) =>
          (await readInfoPlist(path.join(kWorkflows, workflowDir, kRaw)))
            .bundleid,
      ),
    ),
  );
  // Find installed workflows
  const { workflows, warnings } = await listCurrentWorkflows();
  // Notify but ignore bad workflows
  warnings.forEach((warning) => console.log(warning));
  // Filter down to those we want to bootstrap. There are two parts to the
  // filter. Firstly, use process.argv as a list of bundle prefixes, so that we
  // can have workflows installed that aren't part of this machinery. Secondly,
  // ignore those from above for which we already have subdirectories.
  // Discard executable (node) and script from argv
  const prefixes = process.argv.slice(2);
  const needsBootstrap = workflows.filter(
    ({ infoPlist: { bundleid } }) =>
      prefixes.some((prefix) => bundleid.startsWith(prefix)) &&
      !sourceBundleids.has(bundleid),
  );
  const needsBootstrapCount = needsBootstrap.length;
  if (0 == needsBootstrapCount) {
    console.log(`No new workflows for prefixes: ${prefixes}`);
  } else {
    console.log(`Found ${needsBootstrapCount} workflow(s) to bootstrap`);
    for (const { target, infoPlist } of needsBootstrap) {
      const repositoryName = infoPlist.repositoryName();
      console.log();
      console.log(
        `Boostrapping ${repositoryName} from ${infoPlist.name} in ${target}`,
      );
      const workflowPath = path.join(kWorkflows, repositoryName);
      // It's not worth careful reporting here - in fact a partial case fails
      // above when the info.plist can't be found in the workflow directory.
      await fs.mkdir(workflowPath);
      await fs
        .symlink(target, path.join(workflowPath, kInstallation))
        .catch(reportAs(() => `Failed to create symlink ${kInstallation}`));
      await fs.mkdir(path.join(workflowPath, kRaw));
      const packageJson = {
        // And update the fields we can infer from the infoPlist
        name: `@halfyak/alfred-workflows-${repositoryName}`,
        version: infoPlist.version ?? "1.0.0",
        description: infoPlist.description ?? infoPlist.name,
        author: infoPlist.createdby ?? null,
        // Bring in current boiler plate - the template is designed not to clash
        // with fields here, and we want the object fields in a specific order,
        // and empirically they are preserved from this definition.
        ...templatePackageJson,
      };
      await fs.writeFile(
        path.join(workflowPath, "package.json"),
        // stringify doesn't add a trailing newline, so we do
        JSON.stringify(packageJson, null, 2) + "\n",
      );
      await fs.writeFile(
        path.join(workflowPath, "tsconfig.json"),
        // stringify doesn't add a trailing newline, so we do
        JSON.stringify(templateTsconfigJson, null, 2) + "\n",
      );
      // Create src directory hierarchy - use recursive for mkdir -p behaviour,
      // the directory won't exist since we just made workflowPath above.
      await fs.mkdir(path.join(workflowPath, "src", "scripts"), {
        recursive: true,
      });

      // It's temping to import or add skeleton scripts here, but we need to be
      // careful a subsequent export doesn't remove valuable data. The developer
      // can easily mv code from kRaw to src to start using the machinery.

      // We have to copy info.plist to enable import-workflow to do its thing.
      const rawPath = path.join(workflowPath, kRaw);
      await fs.cp(
        path.join(target, kInfoPlist),
        path.join(rawPath, kInfoPlist),
        { preserveTimestamps: true },
      );
      console.log(
        `${workflowPath}: Set installation link, wrote package.json, copied tsconfig.json, created src/scripts, and copied raw/info.plist`,
      );
      console.log("Next steps:");
      console.log(
        helpImportWorkflow({
          cd: [workflowPath],
          extra: ["pnpm install", "pnpm bundle-workflow"],
        }),
      );
    }
  }
});
