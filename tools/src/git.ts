import { ProcessBuilder, splitArrayBufferOn } from "./sundry.ts";

const git = async (...args: string[]) =>
  await new ProcessBuilder("git", ...args).run();

/**
 * Run a git command using -C to set directory, and returning the list of file responses, by internally
 * using -z to zero split the output and processing this.
 */
export const gitCz = async (dir: string, cmd: string, ...args: string[]) =>
  splitArrayBufferOn(await git("-C", dir, cmd, "-z", ...args), 0);

/**
 * Update the git index.
 *
 * Various git commands inspect the index, and some scripts update file timestamps when copying,
 * so sometimes need to refresh before we keep going. We don't need the state from the command, hence the -q.
 */
export const gitUpdateIndex = async () =>
  await git("update-index", "-q", "--refresh");
