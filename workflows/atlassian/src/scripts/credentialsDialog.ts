import {
  displayDialog,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";

import { readClipboard, writeClipboard } from "../pasteboard.ts";
import { createAccount, updateAccountToken } from "../security.ts";
import { suggestedTokenLabel } from "../sundry.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((): AlfredRunScriptJson => {
  writeClipboard(suggestedTokenLabel());
  // This does not support full RFC 5321, specifically a Quoted-string
  // local-part is not permitted, double . in local-parts is permitted, and
  // length limits are not applied. It should be permissive enough for typical
  // usage and can be improved easily enough.
  // See https://www.rfc-editor.org/rfc/rfc5321#section-4.1.2
  // See https://www.rfc-editor.org/rfc/rfc5322#section-3.2.3
  const accountRe =
    /^[!#$%&'*+/0-9=?A-Z^_`a-z{|}~.-]+@[0-9A-Za-z][0-9A-Za-z-]*(\.[0-9A-Za-z][0-9A-Za-z-]*)*$/;
  let account = "";
  let lastError: string | undefined = undefined;
  for (;;) {
    const createResponse = displayDialog(
      `Enter the Atlassian Account email in the text box below.
The workflow has opened the Atlassian Account API Tokens page in your browser.
Verify the account matches that in the top right corner profile menu with your avatar.
Use the Create API token button - a suggested Label has been placed on your clipboard.
Press the Copy button once the token is generated, then press Token Copied below.
${lastError ? `\n${lastError}\n` : ""}
Atlassian Account Email:`,
      {
        withTitle: "Configure Atlassian Account Token",
        defaultAnswer: account,
        buttons: ["Cancel", "Token Copied"],
        defaultButton: "Token Copied",
        withIcon: Path("key.icns"),
      },
    );
    // Note createResponse is undefined when cancelled, this form of the test is
    // more compact, and has better failure modes if we add more buttons.
    if (createResponse?.buttonReturned !== "Token Copied") {
      return { arg: "Cancelled" };
    } else {
      // Persist account around the loop to make editing easier. Note that
      // textReturned won't be undefined according to the displayDialog
      // documentation, since we provided defaultAnswer, but i haven't explained
      // that to typescript yet, so just help it along.
      account = createResponse?.textReturned ?? "";
      if (!accountRe.test(account)) {
        lastError = "Account does not look like a valid email";
        continue;
      }
      const token = readClipboard();
      if (undefined === token) {
        // It's pretty hard for this to happen since we populate the clipboard
        // above with our suggested label, but it is in principle possible.
        lastError = "No token found on clipboard. Did you copy one?";
        continue;
      }
      // We could do a more extensive check, but i can't find Atlassian
      // documentation on this format, and this catches the usual "forgot to
      // copy" case.
      if (!token.startsWith("ATATT")) {
        lastError =
          "Clipboard contents do not look like an Atlassian token. Did you copy one?";
        continue;
      }

      if (createAccount({ account, details: { enabled: true } }, token)) {
        // We clear the system clipboard to discard the token.
        writeClipboard("");
        // Of course, it might have also made it into Alfred's Clipboard History
        // feature, and there's no document API for this. It can be done by
        // editing the Alfred sqlite database directly, but i'm leery of that.
        // Note clipboard is also cleared below on the update path.
        // https://www.alfredforum.com/topic/18702-clear-clipboard-history-and-clipboard/
        return {
          arg: `Created ${account}\nSystem clipboard cleared - check clipboard history also.`,
        };
      } else {
        // createAccount reports false if the account is already present, as opposed to errors in the
        // process which are thrown and will fail the workflow. So verify the overwrite was intended:
        const updateResponse = displayDialog(
          `A token is already present for:
  ${account}
Overwrite with new token?
The previous token cannot be recovered if you choose Update Token.`,
          {
            withTitle: "Update Token?",
            buttons: ["Cancel", "Update Token"],
            defaultButton: "Cancel",
            withIcon: "caution",
          },
        );
        // Note updateResponse is undefined when cancelled, this form of the test is
        // more compact, and has better failure modes if we add more buttons.
        if (updateResponse?.buttonReturned !== "Update Token") {
          return { arg: "Cancelled" };
        } else {
          updateAccountToken(account, token);
          // See notes on the create path above regarding clipboard clear.
          writeClipboard("");
          return {
            arg: `Update ${account}\nSystem clipboard cleared - check clipboard history also.`,
          };
        }
      }
    }
  }
});
