// Alfred specific helpers
// Ultimately we should split the jxa and alfred support, but that means
// untangling the error handling classes.

import { DetailedError } from "./sundry.ts";

/**
 * The common shape of AlfredScriptFilterItem and its `mods` property's values.
 */
interface AlfredScriptFilterItemBase {
  subtitle?: string;
  arg?: string | string[];
  icon?: { path: string };
  valid?: boolean;
  variables?: { [k: string]: string };
}

/**
 * The shape Alfred expects from a Script Filter.
 *
 * This is not necessarily complete yet, i'll build it up as i need it.
 *
 * See https://www.alfredapp.com/help/workflows/inputs/script-filter/json/
 */
export interface AlfredScriptFilterItem extends AlfredScriptFilterItemBase {
  title: string;
  match?: string;
  mods?: {
    // mod is not an arbitrary string, but since it can be a combo via `+` of
    // the basic options "cmd" (⌘), "alt" (⌥), "ctrl" (⌃), "shift" (⇧), and
    // "fn", being exact is too much effort
    [mod: string]: AlfredScriptFilterItemBase;
  };
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

/**
 * The shape Alfred expects from a Run Script.
 *
 * This is not necessarily complete yet, i'll build it up as i need it.
 *
 * See https://www.alfredapp.com/help/workflows/utilities/json/
 */
export interface AlfredRunScriptJson {
  arg?: string | string[];
  config?: { [k: string]: boolean | number | string };
  variables?: { [k: string]: string };
}

type RunScriptHandler = (query: string | undefined) => AlfredRunScriptJson;

/**
 * Runs a run script handler, JSONifying the output for Alfred.
 *
 * Errors are logged then rethrown, which will result in nonzero exit status
 * from osascript. Unfortunately Alfred does not terminate the workflow in this
 * case, subsequent workflow objects will need to be defensive.
 */
export const runScript = (
  handler: RunScriptHandler,
): ((argv: string[]) => string) => {
  return (argv: string[]) => {
    try {
      const [query] = argv;
      return JSON.stringify({ alfredworkflow: handler(query) });
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.log(message);
      if (error instanceof DetailedError) {
        error.details.forEach((detail) => console.log(detail));
      }
      throw error;
    }
  };
};
