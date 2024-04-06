import {
  detailedError,
  runScript,
  AlfredRunScriptJson,
} from "@halfyak/alfred-workflows-jxa";
import { queryAccountDetails, updateAccountDetails } from "../security.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((account): AlfredRunScriptJson => {
  if (undefined === account) {
    throw detailedError("Missing required parameter 'account'");
  }
  const accountItem = queryAccountDetails(account);
  if (undefined === accountItem) {
    // This shouldn't happen based on workflow wiring
    throw detailedError(`Account ${account} now missing?`);
  } else {
    // Toggle enabled
    const enabled = accountItem.details.enabled ? false : true;
    accountItem.details.enabled = enabled;
    updateAccountDetails(accountItem);
    const actionTaken = enabled ? "Enabled" : "Disabled";
    return { arg: `${actionTaken} ${account}` };
  }
});
