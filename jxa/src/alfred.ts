// Alfred specific helpers
// Ultimately we should split the jxa and alfred support, but that means
// untangling the error handling classes.

import { DetailedError } from "./sundry.ts";

/**
 * The shape Alfred expects from a Script Filter.
 *
 * This is not necessarily complete yet, i'll build it up as i need it.
 *
 * See https://www.alfredapp.com/help/workflows/inputs/script-filter/json/
 */
export interface AlfredScriptFilterItem {
  title: string;
  subtitle?: string;
  arg?: string | string[];
  valid?: boolean;
}

type ScriptFilterHandler = (
  query: string | undefined,
) => AlfredScriptFilterItem[];

/**
 * Runs a script filter handler, JSONifying the output for Alfred.
 *
 * Errors are rendered as Alfred Items with `valid: false`, which will be user
 * visible.
 */
export const scriptFilter = (
  handler: ScriptFilterHandler,
): ((argv: string[]) => string) => {
  const alfredItems = (items: AlfredScriptFilterItem[]) =>
    JSON.stringify({ items });
  return (argv: string[]) => {
    try {
      const [query] = argv;
      return alfredItems(handler(query));
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.log(message);
      if (error instanceof DetailedError) {
        error.details.forEach((detail) => console.log(detail));
      }
      return alfredItems([
        { title: "Internal Error", subtitle: message, valid: false },
      ]);
    }
  };
};
