import {
  AlfredRunScriptJson,
  displayDialogRepeat,
  runScript,
} from "@halfyak/alfred-workflows-jxa";

import { clearClipboardAndExplain } from "../clear-clipboard-and-explain.ts";
import { openHelpAndExplain } from "../open-help-and-explain.ts";
import { createAccount, updateAccountToken } from "../security.ts";
import { showTokenDialog } from "../show-token-dialog.ts";
import { showUpdateDialog } from "../show-update-dialog.ts";

const showAccountDialog = () => {
  // This does not support full RFC 5321, specifically a Quoted-string
  // local-part is not permitted, double . in local-parts is permitted, and
  // length limits are not applied. It should be permissive enough for typical
  // usage and can be improved easily enough.
  // See https://www.rfc-editor.org/rfc/rfc5321#section-4.1.2
  // See https://www.rfc-editor.org/rfc/rfc5322#section-3.2.3
  const accountRe =
    /^[!#$%&'*+/0-9=?A-Z^_`a-z{|}~.-]+@[0-9A-Za-z][0-9A-Za-z-]*(\.[0-9A-Za-z][0-9A-Za-z-]*)*$/;
  const accountOk = "Confirm and Open Token Page";
  const accountText = (
    more?: string,
  ) => `Please enter your Atlassian Account email in the text box below.
After you press ${accountOk}, your browser will then be directed to an Atlassian Account page where you can copy an API token.
${more ? `\n${more}\n` : ""}
Atlassian Account Email:`;
  return displayDialogRepeat(
    accountText(),
    {
      withTitle: "Connect Atlassian Account - Email",
      defaultAnswer: "",
      buttons: ["Cancel", "Help", accountOk],
      defaultButton: accountOk,
      withIcon: Path("key.icns"),
    },
    (response, details) => {
      // Whatever happens, persist account around the loop to make editing
      // easier.  Note that textReturned won't be undefined according to the
      // displayDialog documentation, since we provided defaultAnswer, but I
      // haven't explained that to typescript yet, so just help it along.
      // I think something along the lines of
      // https://stackoverflow.com/questions/54416282 could be used, but I
      // stopped trying to make it work when it exceeded my complexity threshold
      // for this case.
      // The trim here is a concession to how easy it is to scoop up whitespace
      // when copy/pasting.
      const account = (response?.textReturned ?? "").trim();
      details.defaultAnswer = account;
      // Note response is undefined when cancelled, the form of the conditions
      // here is chosen for readability and failure modes.
      if (response?.buttonReturned === "Help") {
        return accountText(openHelpAndExplain());
      }
      if (response?.buttonReturned === accountOk) {
        if (!accountRe.test(account)) {
          return accountText(`"${account}" is not a valid email`);
        }
        return { account };
      }
      // In any other case, we're done one way, or another
      return undefined;
    },
  );
};

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((): AlfredRunScriptJson => {
  const accountResponse = showAccountDialog();
  if (undefined === accountResponse) {
    return { arg: "Cancelled" };
  }
  const { account } = accountResponse;
  const tokenResponse = showTokenDialog(
    "Connect Atlassian Account - Token",
    account,
  );
  if (undefined === tokenResponse) {
    return { arg: "Cancelled" };
  }
  const { token } = tokenResponse;
  if (createAccount({ account, details: { enabled: true } }, token)) {
    return { arg: clearClipboardAndExplain(`Created ${account}`) };
  }

  // createAccount reports false if the account is already present, as opposed to errors in the
  // process which are thrown. So verify that the update was intended:
  const updateResponse = showUpdateDialog(
    "Connect Atlassian Account - Confirm Update?",
    account,
  );
  if (!updateResponse) {
    return { arg: "Cancelled" };
  } else {
    updateAccountToken(account, token);
    return { arg: clearClipboardAndExplain(`Updated ${account}`) };
  }
});
