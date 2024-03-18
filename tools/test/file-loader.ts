// Mimic the esbuild file loader for tests

import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * File extensions we can load. Note this is coupled to the `loader` passed to
 * {@link esbuild.build} in {@link ../bin/bundle.mjs}.
 */
const extensions = [".xsl"];

export async function load(
  url: string,
  context: object,
  nextLoad: (url: string, context: object) => object,
) {
  const { protocol } = new URL(url);
  if ("file:" === protocol) {
    const filePath = fileURLToPath(url);
    if (extensions.includes(path.extname(filePath))) {
      const fileName = path.basename(filePath);
      return {
        format: "json",
        // Don't let anyone else try to load it - we're done
        shortCircuit: true,
        source: JSON.stringify(fileName),
      };
    }
  }

  // We don't know how to load this, pass it down the chain
  return nextLoad(url, context);
}
