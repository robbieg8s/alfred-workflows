import {
  AlfredRunScriptJson,
  displayDialogRepeat,
  openUrl,
  readClipboard,
  runScript,
  writeClipboard,
} from "@halfyak/alfred-workflows-jxa";

import { createAccount, updateAccountToken } from "../security.ts";
import { hostFromUrl, suggestedTokenLabel } from "../sundry.ts";
import { atlassianApiTokens, helpAdd } from "../urls.ts";

const openHelpAndExplain = () => {
  openUrl(helpAdd);
  return `The Configuration Help page has been opened in your browser. The tab is served from ${hostFromUrl(helpAdd)}.`;
};

const clearClipboardAndExplain = (account: string) => {
  // We clear the system clipboard to discard the token.
  writeClipboard("");
  // Of course, it might have also made it into Alfred's Clipboard History
  // feature, and there's no documented API for this. It can be done by
  // editing the Alfred sqlite database directly, but I'm leery of that.
  // Note that the clipboard is also cleared below on the update path.
  // https://www.alfredforum.com/topic/18702-clear-clipboard-history-and-clipboard/

  return `Updated ${account}\nSystem clipboard cleared - check clipboard history also.`;
};

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

const showTokenDialog = (account: string) => {
  writeClipboard(suggestedTokenLabel());
  openUrl(atlassianApiTokens);
  const tokenOk = "Paste Token from Clipboard";
  const tokenText = (
    more?: string,
  ) => `The Atlassian Account API Tokens page has been opened in your browser.
Verify the account ${account} matches that shown in the top right corner profile menu with your avatar.
Click the Create API token button in the browser - a suggested Label has been placed on your clipboard.
Click the Copy button in the Atlassian dialog in the browser once the token is generated.
Finally, click the "${tokenOk}" button below.${more ? `\n\n${more}` : ""}`;
  return displayDialogRepeat(
    tokenText(),
    {
      withTitle: "Connect Atlassian Account - Token",
      buttons: ["Cancel", "Help", tokenOk],
      defaultButton: tokenOk,
      withIcon: Path("key.icns"),
    },
    (response) => {
      if (response?.buttonReturned === "Help") {
        return tokenText(openHelpAndExplain());
      }
      if (response?.buttonReturned === tokenOk) {
        const token = readClipboard();
        if (undefined === token) {
          // It's pretty hard for this to happen since we populate the clipboard
          // above with our suggested label, but it is in principle possible.
          return tokenText("No token found on clipboard. Did you copy one?");
        }
        // We could do a more extensive check, but I can't find Atlassian
        // documentation on this format, and this catches the usual "forgot to
        // copy" case.
        if (!token.startsWith("ATATT")) {
          return tokenText(
            "Clipboard contents do not look like an Atlassian API token. Did you copy one?",
          );
        }
        // Ok, all looks good
        return { token };
      }
      // In any other case, we're done one way, or another
      return undefined;
    },
  );
};

const showUpdateDialog = (account: string) => {
  const updateOk = "Update Token";
  const updateText = (more?: string) => `A token is already present for:
  ${account}
Overwrite with the new token?
The previous token cannot be recovered if you choose ${updateOk}.${more ? `\n\n${more}` : ""}`;
  return displayDialogRepeat(
    updateText(),
    {
      withTitle: "Connect Atlassian Account - Confirm Update?",
      buttons: ["Cancel", "Help", updateOk],
      defaultButton: "Cancel",
      withIcon: "caution",
    },
    (response) => {
      if (response?.buttonReturned === "Help") {
        return updateText(openHelpAndExplain());
      }
      return response?.buttonReturned === updateOk;
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
  const tokenResponse = showTokenDialog(account);
  if (undefined === tokenResponse) {
    return { arg: "Cancelled" };
  }
  const { token } = tokenResponse;
  if (createAccount({ account, details: { enabled: true } }, token)) {
    return { arg: clearClipboardAndExplain(account) };
  }

  // createAccount reports false if the account is already present, as opposed to errors in the
  // process which are thrown. So verify that the update was intended:
  const updateResponse = showUpdateDialog(account);
  if (!updateResponse) {
    return { arg: "Cancelled" };
  } else {
    updateAccountToken(account, token);
    return { arg: clearClipboardAndExplain(account) };
  }
});
