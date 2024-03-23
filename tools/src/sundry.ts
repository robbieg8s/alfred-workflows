import { spawn } from "node:child_process";
import { arrayBuffer } from "node:stream/consumers";

/**
 * Create a {@link TextDecoder} for UTF8 which does not substitute replacement
 * characters and does not consume the BOM.
 */
const strictUtf8Decoder = () =>
  new TextDecoder("utf-8", {
    fatal: true,
    ignoreBOM: true,
  });

/**
 * Convert an (@link ArrayBuffer} to a string.
 */
export const arrayBufferToString = (arrayBuffer: ArrayBuffer) =>
  strictUtf8Decoder().decode(new DataView(arrayBuffer));

export const encatchulate = async <Parameters extends unknown[], Return>(
  callable: (...params: Parameters) => Return,
  ...args: Parameters
): Promise<Return> => (async () => callable(...args))();

export const getEnvOrThrow = (name: string) => {
  const value = process.env[name];
  if (undefined === value) {
    throw new Error(`Environment variable '${name}' is not set`);
  }
  return value;
};

export const maybeEnoent = async <Parameters extends unknown[], Return>(
  callable: (...params: Parameters) => Promise<Return>,
  ...args: Parameters
): Promise<Return | undefined> => {
  try {
    return await callable(...args);
  } catch (error) {
    if (error instanceof Error && "code" in error && "ENOENT" === error.code) {
      return undefined;
    } else {
      throw error;
    }
  }
};

/**
 * Split the given `values` into two arrays, the first being those for which
 * `predicate` returns true, the second being those for which `predicate`
 * returns false. The order is preserved in each part.
 */
export const partition = <T>(values: T[], predicate: (value: T) => boolean) =>
  values.reduce(
    // The readonly is needed here to help disambiguate the reduce overloads.
    // Note that the erros only show up at destructuring call sites.
    ([left, right]: readonly [readonly T[], readonly T[]], value: T) =>
      predicate(value)
        ? ([[...left, value], right] as const)
        : ([left, [...right, value]] as const),
    [[], []],
  );

/**
 * Quote a string for the shell to enable printing handy commands.
 */
export const shQuote = (value: string) => {
  // Single quotes quote everything except themselves, so insert them double
  // quoted between single quote free sections, by stopping and restarting.
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
};

function* generateSplitArrayBufferOn(arrayBuffer: ArrayBuffer, value: number) {
  const dataView = new DataView(arrayBuffer);
  const textDecoder = strictUtf8Decoder();
  let start = 0;
  let next = 0;
  while (next < dataView.byteLength) {
    if (value === dataView.getUint8(next)) {
      yield textDecoder.decode(new DataView(arrayBuffer, start, next - start));
      next += 1;
      start = next;
    } else {
      next += 1;
    }
  }
  if (start != next) {
    throw new Error(`no 0x${value.toString(16)} found after index ${next}`);
  }
}

/**
 * Split an array buffer on a given byte value and stringify the sections.
 */
export const splitArrayBufferOn = (arrayBuffer: ArrayBuffer, value: number) => {
  return Array.from(generateSplitArrayBufferOn(arrayBuffer, value));
};

export class ProcessBuilder {
  exe: string;
  argv: string[];
  cwd?: string = undefined;

  constructor(exe: string, ...argv: string[]) {
    this.exe = exe;
    this.argv = argv;
  }

  withCwd(cwd: string) {
    this.cwd = cwd;
    return this;
  }

  async run(): Promise<ArrayBuffer> {
    const child = spawn(this.exe, this.argv, {
      cwd: this.cwd,
      stdio: ["ignore", "pipe", "inherit"],
    });

    return new Promise<ArrayBuffer>((resolve, reject) => {
      let arrayBufferResolve: ArrayBuffer | undefined = undefined;
      let arrayBufferReject: Error | undefined = undefined;
      let haveError: Error | undefined = undefined;
      let haveClose: number | string | null | undefined = undefined;
      const settleIfPossible = () => {
        if (0 === haveClose) {
          // Child process succeeded, so settle with the stdout from the child process
          if (arrayBufferReject !== undefined) {
            reject(arrayBufferReject);
          } else if (arrayBufferResolve !== undefined) {
            resolve(arrayBufferResolve);
          } // else consumer hasn't settled
        } else if (haveClose !== undefined) {
          // Child process failed, but only settle once the arrayBuffer consumer settles.
          // We don't care how it settles, either way we're going use the child process
          // outcomes since code is nonzero.
          if (
            arrayBufferReject !== undefined ||
            arrayBufferResolve !== undefined
          ) {
            if (haveError !== undefined) {
              // Node reported an error with the child process
              reject(haveError);
            } else if ("number" === typeof haveClose) {
              // Report the nonzero exit code as an error
              reject(
                new Error(`Child '${this.exe}' failed: exit code ${haveClose}`),
              );
            } else if ("string" === typeof haveClose) {
              reject(
                new Error(`Child '${this.exe}' exited on signal ${haveClose}`),
              );
            } else {
              // This shouldn't be possible according to node documentation for the
              // 'exit' event of ChildProcess, but typescript needs us to do something.
              reject(
                new Error(
                  `Child '${this.exe}' violated node documentation ${haveClose}`,
                ),
              );
            }
          } // else reader hasn't settled
        } // else do nothing - the process is still running
      };
      arrayBuffer(child.stdout).then(
        (arrayBuffer) => {
          arrayBufferResolve = arrayBuffer;
          settleIfPossible();
        },
        (error) => {
          arrayBufferReject = error;
          settleIfPossible();
        },
      );
      child.on("error", (error) => {
        haveError = error;
        settleIfPossible();
      });
      child.on("close", (code, signal) => {
        haveClose = signal !== null ? signal : code;
        settleIfPossible();
      });
    });
  }
}
