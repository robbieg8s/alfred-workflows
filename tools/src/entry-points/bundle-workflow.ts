// This script assembles the workflow into the kDist directory.
// After running, the kDist directory shall look like an installed Alfred
// Workflow, ready to either update in situ or parcel up to a zip.

import esbuild from "esbuild";
import fs from "node:fs/promises";

import { runCli, reportAs } from "../cli.ts";
import { kDist, kRaw } from "../fs-layout.ts";

/**
 * An esbuild plugin for minifying graphql to an importable string.
 */
const minifyGraphqlOnLoadPlugin = {
  name: "minifyGraphql",
  setup(build: esbuild.PluginBuild) {
    const commentRe = /#[^\n]*\n/g;
    const newlineRe = /\n/g;
    const compressSpaceRe = /\s\s+/g;
    const symbolAdjacentSpaceRe = / ?([:,{}]) ?/g;
    build.onLoad({ filter: /\.graphql$/ }, async ({ path }) => ({
      loader: "json",
      contents: JSON.stringify(
        (await fs.readFile(path, "utf8"))
          .replaceAll(commentRe, "\n")
          .replaceAll(newlineRe, " ")
          .replaceAll(compressSpaceRe, " ")
          .replaceAll(symbolAdjacentSpaceRe, (_, symbol) => symbol),
      ),
    }));
  },
};

runCli(async () => {
  // Start clean
  await fs.rm(kDist, { force: true, recursive: true });
  // Normally esbuild will make the output directory, but it doesn't if there
  // are no source scripts, which happens in the import flow, so make it here.
  await fs.mkdir(kDist);

  // Firstly, transpile/bundle the src ts into kDist. The entry points are
  // `scripts` in Alfred terminology, called using External Script configuration
  // of Script Filter or Run Script.
  const scriptsDir = "./src/scripts";
  const scriptNames = await fs.readdir(scriptsDir);
  const result = await esbuild
    .build({
      banner: {
        // Run the scripts using JXA
        js: "#!/usr/bin/osascript -lJavaScript",
      },
      bundle: true,
      entryPoints: scriptNames.map((name) => `${scriptsDir}/${name}`),
      // Just parcel up the code for execution, the scripts internally assign to
      // a known global `run` to set up a handler which osascript calls.
      format: "iife",
      // When using platform neutral below, we need to instruct esbuild to
      // respect main
      mainFields: ["main"],
      metafile: true,
      minify: true,
      outdir: kDist,
      // Platform neutral since we don't want any node or browser support -
      // we're bundling for osascript.
      platform: "neutral",
      plugins: [minifyGraphqlOnLoadPlugin],
      // esbuild ignores most tsconfig, but it does respect "strict" and emits a
      // "use strict", which results in undesirable output from the script, so
      // just ignore all tsconfig.  We will revisit if we end up needing
      // tsconfig visible here for some future reason.
      tsconfigRaw: {},
    })
    .catch(reportAs(() => "esbuild failed, see errors above"));
  console.log(await esbuild.analyzeMetafile(result.metafile));
  const distScriptNames = await fs.readdir(kDist);
  await Promise.all(
    distScriptNames.map((name) => fs.chmod(`${kDist}/${name}`, "755")),
  );

  // Next, copy the kRaw files across - notably info.plist, but there can be
  // other binary assets such as images and icons.  There's no point doing a
  // sync here, since we clear kDist each time, we must copy everything.  To
  // improve this, we'd need to find out from esbuild what it copied, or use
  // another intermediate staging.  Use errorOnExists and !force because we
  // cleared kDist first, so if anything is there it's a src/kRaw clash.
  // Empirically, the mode (in the sense of chmod) is preserved by this copy,
  // which is what we want.
  await fs
    .cp(kRaw, kDist, {
      errorOnExist: true,
      force: false,
      preserveTimestamps: true,
      recursive: true,
    })
    .catch(
      reportAs(
        () =>
          `Failed to copy raw file(s) ${kRaw} -> ${kDist}, check for clash?`,
      ),
    );
});
