import {
  displayDialogRepeat,
  openUrl,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";

import { readClipboard, writeClipboard } from "../pasteboard.ts";
import { createAccount, updateAccountToken } from "../security.ts";
import { hostFromUrl, suggestedTokenLabel } from "../sundry.ts";
import { atlassianApiTokens, helpAdd } from "../urls.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((): AlfredRunScriptJson => {
  writeClipboard(suggestedTokenLabel());
  openUrl(atlassianApiTokens);
  // Empirically i need to insert a delay here to give the browser time to become frontmost.
  delay(0.1);
  const openHelpAndExplain = () => {
    openUrl(helpAdd);
    return `Configuration Help page has been opened in your browser. The tab is served from ${hostFromUrl(helpAdd)}.`;
  };

  // This does not support full RFC 5321, specifically a Quoted-string
  // local-part is not permitted, double . in local-parts is permitted, and
  // length limits are not applied. It should be permissive enough for typical
  // usage and can be improved easily enough.
  // See https://www.rfc-editor.org/rfc/rfc5321#section-4.1.2
  // See https://www.rfc-editor.org/rfc/rfc5322#section-3.2.3
  const accountRe =
    /^[!#$%&'*+/0-9=?A-Z^_`a-z{|}~.-]+@[0-9A-Za-z][0-9A-Za-z-]*(\.[0-9A-Za-z][0-9A-Za-z-]*)*$/;
  const createText = (
    more?: string,
  ) => `Enter the Atlassian Account email in the text box below.
The Atlassian Account API Tokens page has been opened in your browser.
Verify the account matches that in the top right corner profile menu with your avatar.
Use the Create API token button - a suggested Label has been placed on your clipboard.
Press the Copy button once the token is generated, then press Token Copied below.
${more ? `\n${more}\n` : ""}
Atlassian Account Email:`;
  const createAnswer = displayDialogRepeat(
    createText(),
    {
      withTitle: "Connect Atlassian Account",
      defaultAnswer: "",
      buttons: ["Cancel", "Help", "Token Copied"],
      defaultButton: "Token Copied",
      withIcon: Path("key.icns"),
    },
    (response, details) => {
      // Whatever happens, persist account around the loop to make editing
      // easier.  Note that textReturned won't be undefined according to the
      // displayDialog documentation, since we provided defaultAnswer, but i
      // haven't explained that to typescript yet, so just help it along.
      // I think something along the lines of
      // https://stackoverflow.com/questions/54416282 could be used, but i
      // stopped trying to make it work when it exceeded my complexity threshold
      // for this case.
      const account = response?.textReturned ?? "";
      details.defaultAnswer = account;
      // Note response is undefined when cancelled, the form of the conditions
      // here is chosen for readability and failure modes.
      if (response?.buttonReturned === "Help") {
        return createText(openHelpAndExplain());
      } else if (response?.buttonReturned === "Token Copied") {
        if (!accountRe.test(account)) {
          return createText("Account does not look like a valid email");
        }
        const token = readClipboard();
        if (undefined === token) {
          // It's pretty hard for this to happen since we populate the clipboard
          // above with our suggested label, but it is in principle possible.
          return createText("No token found on clipboard. Did you copy one?");
        }
        // We could do a more extensive check, but i can't find Atlassian
        // documentation on this format, and this catches the usual "forgot to
        // copy" case.
        if (!token.startsWith("ATATT")) {
          return createText(
            "Clipboard contents do not look like an Atlassian API token. Did you copy one?",
          );
        }
        // Ok, all looks good
        return { account, token };
      }
      // In any other case, we're done one way, or another
      return undefined;
    },
  );
  if (undefined === createAnswer) {
    return { arg: "Cancelled" };
  } else {
    const { account, token } = createAnswer;
    if (createAccount({ account, details: { enabled: true } }, token)) {
      // We clear the system clipboard to discard the token.
      writeClipboard("");
      // Of course, it might have also made it into Alfred's Clipboard History
      // feature, and there's no document API for this. It can be done by
      // editing the Alfred sqlite database directly, but i'm leery of that.
      // Note clipboard is also cleared below on the update path.
      // https://www.alfredforum.com/topic/18702-clear-clipboard-history-and-clipboard/
      return {
        arg: `Connected ${account}\nSystem clipboard cleared - check clipboard history also.`,
      };
    }

    // createAccount reports false if the account is already present, as opposed to errors in the
    // process which are thrown. So verify the overwrite was intended:
    const updateText = (more?: string) => `A token is already present for:
  ${account}
Overwrite with new token?
The previous token cannot be recovered if you choose Update Token.${more ? `\n\n${more}` : ""}`;
    const updateAnswer = displayDialogRepeat(
      updateText(),
      {
        withTitle: "Update Token?",
        buttons: ["Cancel", "Help", "Update Token"],
        defaultButton: "Cancel",
        withIcon: "caution",
      },
      (response) => {
        if (response?.buttonReturned === "Help") {
          return updateText(openHelpAndExplain());
        }
        return response?.buttonReturned === "Update Token";
      },
    );

    if (!updateAnswer) {
      return { arg: "Cancelled" };
    } else {
      updateAccountToken(account, token);
      // See notes on the create path above regarding clipboard clear.
      writeClipboard("");
      return {
        arg: `Updated ${account}\nSystem clipboard cleared - check clipboard history also.`,
      };
    }
  }
});
