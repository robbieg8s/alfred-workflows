import {
  detailedError,
  displayDialog,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";

import { deleteAccount } from "../security.ts";

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
    return {
      arg: `Disconnected ${account}`,
      variables: { action: "delete", account },
    };
  }
});
