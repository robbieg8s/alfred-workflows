import { displayDialogRepeat } from "@halfyak/alfred-workflows-jxa";
import { openHelpAndExplain } from "./open-help-and-explain.ts";

export const showUpdateDialog = (title: string, account: string) => {
  const updateOk = "Update Token";
  const updateText = (more?: string) => `A token is already present for:
  ${account}
Overwrite with the new token?
The previous token cannot be recovered if you choose ${updateOk}.${more ? `\n\n${more}` : ""}`;
  return displayDialogRepeat(
    updateText(),
    {
      withTitle: title,
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
