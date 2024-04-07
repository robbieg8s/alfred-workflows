import { JxaPath } from "./api";

export const createUserDateFormatter = () => {
  const dateFormatter = $.NSDateFormatter.alloc.init;
  dateFormatter.dateFormat =
    $.NSDateFormatter.dateFormatFromTemplateOptionsLocale(
      "HmEdMMM",
      0,
      $.NSLocale.currentLocale,
    );
  return (nsDate: unknown) => dateFormatter.stringFromDate(nsDate).js;
};

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

interface DisplayDialogDetails<TButton> {
  defaultAnswer?: string;
  hiddenAnswer?: boolean;
  buttons?: TButton[];
  defaultButton?: string | number;
  cancelButton?: string | number;
  withTitle?: string;
  /**
   * This can also be a resource name or ID, but i'm not using these, and it
   * would remove the useful typechecking on the string.
   */
  withIcon?: "stop" | "note" | "caution" | JxaPath;
  givingUpAfter?: number;
}

interface DisplayDialogResponse<TButton> {
  buttonReturned: TButton;
  textReturned?: string;
  gaveUp?: boolean;
}

/**
 * Display a dialog.
 *
 * This uses the OSAScript Application.displayDialog, but translates the cancel
 * exception to returning undefined.
 */
export const displayDialog = <TButton extends string>(
  text: string,
  details: DisplayDialogDetails<TButton>,
): DisplayDialogResponse<TButton> | undefined => {
  const application = Application.currentApplication();
  application.includeStandardAdditions = true;
  try {
    return application.displayDialog(
      text,
      details,
    ) as DisplayDialogResponse<TButton>;
  } catch (error) {
    // Yes, displayDialog really throws for cancel. It's not trivial to infer
    // the cancel button since macOS decides it, so just return undefined.
    return undefined;
  }
};

/**
 * Display a dialog repeatedly.
 *
 * This is intended for use in validation scenarios, or where supplemental
 * buttons are provided which should not dismiss the dialog. Since there is no
 * direct support for this in JXA, we simply reraise the dialog when it should
 * not be dismissed.
 *
 * @param text - passed to the first invocation of {@link displayDialog}.
 * @param details - passed to the first invocation of {@link displayDialog}.
 * @param repeat - called with a `response` from {@link displayDialog}. If
 * `repeat` returns a string, {@link displayDialog} is reinvoked with that
 * string as `text` and the (possibly modified) `details`, and `repeat` will be
 * invoked again when the repeat dialog is closed.  If `repeat` returns anything
 * else, it is returned to the caller of {@link displayDialogRepeat}.
 */
export const displayDialogRepeat = <const TButton extends string, TAnswer>(
  text: string,
  details: DisplayDialogDetails<TButton>,
  repeat: (
    response: DisplayDialogResponse<TButton> | undefined,
    details: DisplayDialogDetails<TButton>,
  ) => string | TAnswer,
) => {
  let response = displayDialog(text, details);
  for (;;) {
    const textOrAnswer = repeat(response, details);
    if ("string" === typeof textOrAnswer) {
      response = displayDialog(textOrAnswer, details);
    } else {
      return textOrAnswer;
    }
  }
};
