import {
  displayDialogRepeat,
  openUrl,
  readClipboard,
  writeClipboard,
} from "@halfyak/alfred-workflows-jxa";
import { suggestedTokenLabel } from "./sundry.ts";
import { atlassianApiTokens } from "./urls.ts";
import { openHelpAndExplain } from "./open-help-and-explain.ts";

export const showTokenDialog = (title: string, account: string) => {
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
      withTitle: title,
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
