// This script sets up new source controlled directory for an Alfred workflow by
// importing an existing workflow.

import fs from "node:fs/promises";
import path from "node:path";

import { listCurrentWorkflows } from "../alfred.ts";
import { reportAs, runCli } from "../cli.ts";
import { kInstallation, kRaw } from "../fs-layout.ts";
import { kInfoPlist, readInfoPlist } from "../info-plist.ts";
import { helpImportWorkflow, packageName } from "../workflow.ts";

import templatePackageJson from "../template-package.json";
import templateTsconfigJson from "../template-tsconfig.json";
import { partition } from "../sundry.js";

runCli(async () => {
  // The repository subdirectory for the workflows
  const kWorkflows = "workflows";
  // Find the workflows we already have. Use bundleid from kRaw, because we want
  // don't want to assume all workflows are installed.
  const sourceBundleids = new Set(
    await Promise.all(
      (await fs.readdir(kWorkflows))
        .filter((workflowDir) => !workflowDir.startsWith("."))
        .map(
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
  // Discard executable (node) and script from argv to get just CLI arguments
  // which are prefixes to filter by.
  const prefixes = process.argv.slice(2);
  // Filter down to those we want to bootstrap. We ignore those from above for
  // which we already have subdirectories. After this, we bootstrap those which
  // match a prefix (from process.argv above), and report those we are skipping.
  // This allows us to have workflows installed that aren't part of this
  // machinery, but still know what we'd need to include to pull thigns in.
  const [included, skipped] = partition(
    workflows.filter(
      ({ infoPlist: { bundleid } }) => !sourceBundleids.has(bundleid),
    ),
    ({ infoPlist: { bundleid } }) =>
      prefixes.some((prefix) => bundleid.startsWith(prefix)),
  );
  const skippedCount = skipped.length;
  if (0 !== skippedCount) {
    console.log(`Skipping ${skippedCount} workflow(s) not matching prefixes.`);
    for (const {
      infoPlist: { bundleid, name },
    } of skipped) {
      console.log(`  ${bundleid}: ${name}`);
    }
  }
  const includedCount = included.length;
  if (0 === includedCount) {
    if (0 === prefixes.length) {
      console.log(
        "Provide bundleid prefixes to bootstrap-worfklow to select workflows to bootstrap",
      );
    } else {
      console.log(`No new workflows for prefixes: ${prefixes}`);
    }
  } else {
    console.log(`Found ${includedCount} workflow(s) to bootstrap.`);
    for (const { target, infoPlist } of included) {
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
        name: packageName(repositoryName),
        version: infoPlist.version ?? "1.0.0",
        description: infoPlist.description ?? infoPlist.name,
        author: infoPlist.createdby ?? null,
        // Bring in current boilerplate - the template is designed not to clash
        // with fields here, and we want the fields this object in a specific
        // order, and empirically they are preserved from this definition.
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
