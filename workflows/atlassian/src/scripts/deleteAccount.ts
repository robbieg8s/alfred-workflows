import {
  detailedError,
  displayDialog,
  openUrl,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";

import { deleteAccount } from "../security.ts";
import { suggestedTokenLabel } from "../sundry.ts";
import { atlassianApiTokens } from "../urls.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((account): AlfredRunScriptJson => {
  if (undefined === account) {
    throw detailedError("Missing required parameter 'account'");
  }
  // Confirm with the user, since token deletion is irreversible
  const response = displayDialog(
    `Really remove token and disconnect Atlassian Account:
  ${account}
from Halfyak Atlassian workflow for Alfred?

This cannot be undone.`,
    {
      withTitle: "Confirm Disconnect Account",
      buttons: ["Cancel", "Disconnect"],
      defaultButton: "Cancel",
      withIcon: "stop",
    },
  );
  // Note response is undefined when cancelled, this form of the test is more
  // compact, and has better failure modes if we add more buttons.
  if (response?.buttonReturned !== "Disconnect") {
    return { arg: "Cancelled", variables: { action: "cancel" } };
  } else {
    deleteAccount(account);
    openUrl(atlassianApiTokens);
    // Empirically i need to insert a delay here to give the browser time to become frontmost.
    delay(0.1);
    displayDialog(
      `Account disconnected. You still need to manually revoke the API Token for:
  ${account}
The Atlassian Account API Tokens page has been opened in your browser.
Verify the account matches that in the top right corner profile menu with your avatar.
Find the corresponding token, and click the Revoke link under Action.
The Label suggested on creation was ${suggestedTokenLabel()}`,
      {
        withTitle: "Revoke API Token",
        buttons: ["I have revoked the token"],
        withIcon: "note",
      },
    );
    return { arg: `Disconnected ${account}` };
  }
});
