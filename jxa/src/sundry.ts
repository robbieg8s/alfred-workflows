export class DetailedError extends Error {
  constructor(
    message: string,
    public readonly details: string[],
  ) {
    super(message);
  }
}

export const detailedError = (message: string, ...details: string[]) =>
  new DetailedError(message, details);
