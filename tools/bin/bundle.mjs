#!/usr/bin/env node

// This is the build script for the tooling, and as such has to be javascript
// for bootstrapping purposes. Of course, this is somewhat similar to the script
// invoking esbuild to build workflows.

import esbuild from "esbuild";
import fs from "fs/promises";

try {
  const distDir = "./dist";
  // Start clean
  await fs.rm(distDir, { force: true, recursive: true });
  const entryPointsDir = "./src/entry-points";
  const entryPointNames = await fs.readdir(entryPointsDir);
  // If esbuild set up throws, we want the outer catch, because you usually need
  // a stack trace.  However, failures from the build proper use on the inner
  // catch, because they're sufficiently descriptive we can suppress the stack.
  const esbuildPromise = esbuild.build({
    banner: {
      // Tooling runs with node
      js: "#!/usr/bin/env node",
    },
    bundle: true,
    entryPoints: entryPointNames.map((name) => `${entryPointsDir}/${name}`),
    // We don't want to inline the esbuild code, because it uses dynamic require
    // which it doesn't support for ESM format output.
    external: ["esbuild"],
    // ESM allows for nicer code for scripts, like top level await for example
    format: "esm",
    // Copy xsl in for plist parsing - note the list of extensions here is
    // replicated in coupled to {@link ../test/file-loader.ts}.
    loader: { ".xsl": "file" },
    outdir: distDir,
    platform: "node",
    // Although we'll run this more than we rebuild it, minify is omitted above
    // because it impacts error reporting
  });
  try {
    // Ignore return from esbuild.build - esbuild already has good logging, and
    // there's nothing else here in our setup.
    await esbuildPromise;
  } catch (error) {
    console.log("esbuild failed, see errors above");
    process.exit(1);
  }
  const toolNames = await fs.readdir(distDir);
  await Promise.all(
    toolNames.map((name) => fs.chmod(`${distDir}/${name}`, "755")),
  );
} catch (error) {
  console.log(error);
  process.exit(2);
}
