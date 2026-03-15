import {
  detailedError,
  displayDialog,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";

import { clearClipboardAndExplain } from "../clear-clipboard-and-explain.ts";
import { updateAccountToken } from "../security.ts";
import { showTokenDialog } from "../show-token-dialog.ts";
import { showUpdateDialog } from "../show-update-dialog.ts";
import { suggestedTokenLabel } from "../sundry.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((account): AlfredRunScriptJson => {
  if (undefined === account) {
    throw detailedError("Missing required parameter 'account'");
  }
  const tokenResponse = showTokenDialog(
    "Rotate Atlassian Account Token",
    account,
  );
  if (undefined === tokenResponse) {
    return { arg: "Cancelled" };
  }
  const { token } = tokenResponse;
  // Confirm update, since we replace the prior token
  const updateResponse = showUpdateDialog(
    "Rotate Atlassian Account Token - Confirm Update?",
    account,
  );
  if (updateResponse) {
    updateAccountToken(account, token);
  }
  const unused = updateResponse ? "old" : "new";
  displayDialog(
    `Before closing the Atlassian Account API Tokens page, you should revoke the unused (${unused}) API Token.
The Label suggested on creation was ${suggestedTokenLabel()}.
Click the Revoke link under Action on the unused (${unused}) token.
This cannot be undone.`,
    {
      withTitle: "Revoke API Token",
      buttons: ["I have revoked the token"],
      withIcon: "note",
    },
  );
  return {
    arg: clearClipboardAndExplain(unused ? `Rotated ${account}` : "Cancelled"),
  };
});
