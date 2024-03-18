/**
 * An error class which is reported simplified, without a stack trace, and
 * indicates the cli should exit with code 1.
 */
export class ReportableError extends Error {
  details: string[];

  constructor(message: string, details?: string[], error?: unknown) {
    super(message, { cause: error });
    this.details = details ?? [];
  }

  /**
   * Print this error via {@link console.log}.
   */
  report() {
    console.log(this.message);
    this.details.forEach((detail) => {
      console.log(detail);
    });
    if (this.cause !== undefined) {
      console.log(
        `Cause: ${this.cause instanceof Error ? this.cause.message : this.cause}`,
      );
    }
  }
}

/**
 * Convenience factory method for creating {@link ReportableError} with details.
 */
export const reportableError = (message: string, ...details: string[]) => {
  return new ReportableError(message, details);
};

/**
 * Conveniently embed a deferred evaluation of the message and details for a
 * {@link ReportableError} in a {@link Promise.catch}.
 */
export const reportAs = (
  message: () => string,
  details?: () => string[],
): ((error: unknown) => never) => {
  return (error) => {
    throw new ReportableError(
      message(),
      details !== undefined ? details() : undefined,
      error,
    );
  };
};

/**
 * Run a given `handler`, catching all errors and reporting {@link
 * ReportableError} with no stack trace and exit code 1, and other errors
 * with a stack trace and exit code 2.
 */
export const runCli = (handler: () => Promise<void>) => {
  handler().catch((error: unknown) => {
    if (error instanceof ReportableError) {
      error.report();
      process.exit(1);
    } else {
      console.log(error);
      process.exit(2);
    }
  });
};
