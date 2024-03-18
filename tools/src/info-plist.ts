import fs from "node:fs/promises";
import { Stats, BigIntStats } from "node:fs";
import path from "node:path";
import { maybeEnoent, splitArrayBufferOn, ProcessBuilder } from "./sundry.ts";
import parseInfoPlistXsl from "./parse-info-plist.xsl";

export const kInfoPlist = "info.plist";

/**
 * Class for the fields of interest to this tooling in the Alfred `info.plist`
 * file.
 */
export class InfoPlist {
  bundleid: string;
  name: string;
  version?: string;

  constructor(bundleid: string, name: string, version?: string) {
    this.bundleid = bundleid;
    this.name = name;
    this.version = version;
  }

  /**
   * The name we use for the installable Alfred workflow file.
   */
  exportName() {
    return this.name.replaceAll(/[^\w]/g, "_") + ".alfredworkflow";
  }

  describe() {
    // This is a pretty basic description, but it works
    return JSON.stringify(this);
  }
}

/**
 * Parse lines of output from {@link parse-info-plist.xsl}.
 */
const splitKeyValue = (keyValue: string) => {
  const space = keyValue.indexOf(" ");
  if (-1 === space) {
    throw new Error(`no space in keyValue '${keyValue}'`);
  } else {
    // Note the space is in neither half
    return [keyValue.slice(0, space), keyValue.slice(space + 1)];
  }
};

/**
 * Use `xsltproc` and {@link parse-info-plist.xsl} to parse the info.plist into
 * a form we can easily turn into key value pairs.
 */
const parseInfoPlist = async (infoPlistPath: string) => {
  const xsltproc = new ProcessBuilder(
    "xsltproc",
    "--nonet",
    "--novalid",
    path.join(import.meta.dirname, parseInfoPlistXsl),
    infoPlistPath,
  );
  try {
    return await xsltproc.run();
  } catch (error) {
    throw new Error(`Failed to process (xsltproc) ${infoPlistPath}`, {
      cause: error,
    });
  }
};

interface ReadInfoPlistOptions<T> {
  noDir?: (infoPlistPath: string) => T;
  dirStat?: (infoPlistPath: string, link: Stats | BigIntStats) => void;
  noFile?: (infoPlistPath: string) => T;
  corruptXml?: (infoPlistPath: string, error: unknown) => T;
  missingField?: (key: string) => T;
}

export const verifySymlink = (
  infoPlistPath: string,
  lstat: { mode: number | bigint; isSymbolicLink: () => boolean },
) => {
  if (!lstat.isSymbolicLink()) {
    throw new Error(
      `Expected ${infoPlistPath} to be a symlink, but it's not (mode = octal ${lstat.mode.toString(8)})`,
    );
  }
};

export const readInfoPlist = async <T = never>(
  workflowDir: string,
  options: ReadInfoPlistOptions<T> = {},
): Promise<InfoPlist | T> => {
  const noDir =
    options.noDir ??
    ((infoPlistPath: string) => {
      throw new Error(`No workflow directory at '${infoPlistPath}'`);
    });
  const dirStat = options.dirStat ?? (() => {});
  const noFile =
    options.noFile ??
    ((infoPlistPath: string) => {
      throw new Error(`No ${kInfoPlist} found at '${infoPlistPath}'`);
    });
  const corruptXml =
    options.corruptXml ??
    ((infoPlistPath: string, error: unknown) => {
      throw new Error(
        `Corrupt XML in ${kInfoPlist} found at '${infoPlistPath}'`,
        { cause: error },
      );
    });
  const missingField =
    options.missingField ??
    ((infoPlistPath: string, key: string) => {
      throw new Error(
        `Missing field '${key}' in ${kInfoPlist} at '${infoPlistPath}'`,
      );
    });

  // Since parseInfoPlist executes xsltproc as a child process, we can't easily
  // trap an ENOENT from it, so we check externally for the relevant files to
  // get better error messages
  const lstatDir = await maybeEnoent(fs.lstat, workflowDir);
  if (undefined === lstatDir) {
    return noDir(workflowDir);
  } else {
    dirStat(workflowDir, lstatDir);
    const infoPlistPath = path.join(workflowDir, "info.plist");
    // Again, do this externally for better error messages. Use lstat for
    // consistency even though we probably don't need it.
    const lstatFile = await maybeEnoent(fs.lstat, infoPlistPath);
    if (undefined === lstatFile) {
      return noFile(infoPlistPath);
    } else {
      // We really want to localize any parse errors to the corruptXml handler
      let parsedXml;
      try {
        parsedXml = await parseInfoPlist(infoPlistPath);
      } catch (error) {
        return corruptXml(infoPlistPath, error);
      }
      const { bundleid, name, version } = Object.fromEntries(
        splitArrayBufferOn(parsedXml, 0xa).map(splitKeyValue),
      );
      if (!bundleid) {
        return missingField(infoPlistPath, "bundleid");
      } else if (!name) {
        return missingField(infoPlistPath, "name");
      } else {
        return new InfoPlist(bundleid, name, version);
      }
    }
  }
};
