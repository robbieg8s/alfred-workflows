import { JxaPath } from "./api";

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

interface DisplayDialogDetails {
  defaultAnswer?: string;
  hiddenAnswer?: boolean;
  buttons?: string[];
  defaultButton?: string | number;
  cancelButton?: string | number;
  withTitle?: string;
  /**
   * This can also be a resource name or ID, but i'm not using these, and it
   * would removes the useful typechecking on the string.
   */
  withIcon?: "stop" | "note" | "caution" | JxaPath;
  givingUpAfter?: number;
}

interface DisplayDialogResponse {
  buttonReturned: string;
  textReturned?: string;
  gaveUp?: boolean;
}

/**
 * Display a dialog.
 *
 * This uses the OSAScript Application.displayDialog, but translates the cancel
 * exception to returning undefined.
 */
export const displayDialog = (
  text: string,
  details: DisplayDialogDetails,
): DisplayDialogResponse | undefined => {
  const application = Application.currentApplication();
  application.includeStandardAdditions = true;
  try {
    return application.displayDialog(text, details) as DisplayDialogResponse;
  } catch (error) {
    // Yes, displayDialog really throws for cancel. It's not trivial to infer
    // the cancel button since macOS decides it, so just return undefined.
    return undefined;
  }
};
