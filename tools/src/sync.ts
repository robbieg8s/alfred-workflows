import fs from "node:fs/promises";
import path from "node:path";

import { maybeEnoent } from "./sundry.ts";

// This enum is in "importance" order from the perspective of determining actions.
// Notably, this means the SourceNotAFile and TargetNotAFile come before other results.
enum SyncResult {
  SourceNotAFile,
  TargetNotAFile,
  SourceAbsent,
  TargetAbsent,
  SourceNewer,
  TargetNewer,
  SameTimestamp,
}

export enum SyncAction {
  None,
  Copy,
  Delete,
  Fail,
}

export const syncOutcomes = async (
  source: string,
  target: string,
  syncNames: string[],
  ignores: Set<string> = new Set(),
) => {
  const syncResult = async (name: string) => {
    const [sourceStat, targetStat] = await Promise.all(
      [source, target].map(async (dir) =>
        maybeEnoent(fs.stat, path.join(dir, name)),
      ),
    );
    // We want to report these in SyncResult order - which is why this isn't in the "obvious" order
    if (sourceStat !== undefined && !sourceStat.isFile()) {
      return SyncResult.SourceNotAFile;
    } else if (targetStat !== undefined && !targetStat.isFile()) {
      return SyncResult.TargetNotAFile;
    } else if (sourceStat === undefined) {
      return SyncResult.SourceAbsent;
    } else if (targetStat === undefined) {
      return SyncResult.TargetAbsent;
    } else if (sourceStat.mtime > targetStat.mtime) {
      return SyncResult.SourceNewer;
    } else if (sourceStat.mtime < targetStat.mtime) {
      return SyncResult.TargetNewer;
    } else {
      return SyncResult.SameTimestamp;
    }
  };

  const syncOutcome = (name: string, result: SyncResult) => {
    switch (result) {
      case SyncResult.SourceNotAFile: {
        return {
          action: SyncAction.Fail,
          reason: `${source}/${name} is not a plain file`,
        };
      }
      case SyncResult.TargetNotAFile: {
        return {
          action: SyncAction.Fail,
          reason: `${target}/${name} is not a plain file`,
        };
      }
      case SyncResult.SourceAbsent: {
        // If its not in source, it must be in target, and we don't want it anymore
        return { action: SyncAction.Delete };
      }
      case SyncResult.TargetAbsent: {
        // Don't worry about ignored files that are missing from target, otherwise copy
        return {
          action: ignores.has(name) ? SyncAction.None : SyncAction.Copy,
        };
      }
      case SyncResult.SourceNewer: {
        return { action: SyncAction.Copy };
      }
      case SyncResult.TargetNewer: {
        return {
          action: SyncAction.Fail,
          reason: `${target}/${name} is newer than ${source}/${name}`,
        };
      }
      case SyncResult.SameTimestamp: {
        return { action: SyncAction.None };
      }
    }
  };

  return await Promise.all(
    syncNames.map(async (name) => ({
      name,
      ...syncOutcome(name, await syncResult(name)),
    })),
  );
};
