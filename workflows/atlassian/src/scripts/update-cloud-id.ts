import {
  detailedError,
  runScript,
  AlfredRunScriptJson,
  displayDialogRepeat,
} from "@halfyak/alfred-workflows-jxa";
import {
  AccountItem,
  queryAccountDetails,
  updateAccountDetails,
} from "../security.ts";

const showCloudIdDialog = ({ account }: AccountItem) => {
  const cloudIdRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const cloudIdText = (more?: string) =>
    `Please enter site Cloud Id for ${account} in the text box below. ${more ? `\n${more}\n` : ""}`;
  return displayDialogRepeat(
    cloudIdText(),
    {
      withTitle: "Set Cloud Id",
      defaultAnswer: "",
      buttons: ["Cancel", "OK"],
      defaultButton: "OK",
      withIcon: Path("key.icns"),
    },
    (response, details) => {
      // See comment on similar code in showAccountDialog.
      const cloudId = (response?.textReturned ?? "").trim();
      details.defaultAnswer = cloudId;
      // Note response is undefined when cancelled, the form of the conditions
      // here is chosen for readability and failure modes.
      if (response?.buttonReturned === "OK") {
        if (!cloudIdRe.test(cloudId)) {
          return cloudIdText(`"${cloudId}" is not a valid Cloud Id`);
        }
        return { cloudId };
      }
      // In any other case, we're done one way, or another
      return undefined;
    },
  );
};

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((account): AlfredRunScriptJson => {
  if (undefined === account) {
    throw detailedError("Missing required parameter 'account'");
  }
  const accountItem = queryAccountDetails(account);
  if (undefined === accountItem) {
    throw detailedError(`Cannot find details for ${account}`);
  }
  const cloudIdResponse = showCloudIdDialog(accountItem);
  if (undefined === cloudIdResponse) {
    return { arg: "Cancelled" };
  } else {
    // Set/Update Cloud Id
    accountItem.details.sites = [cloudIdResponse];
    updateAccountDetails(accountItem);
    return { arg: `Updated ${account}` };
  }
});
