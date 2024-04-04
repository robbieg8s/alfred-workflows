import {
  detailedError,
  displayDialog,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";

import { suggestedTokenLabel } from "../sundry.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((account): AlfredRunScriptJson => {
  if (undefined === account) {
    throw detailedError("Missing required parameter 'account'");
  }
  displayDialog(
    `You need to revoke the API Token for:
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
});
