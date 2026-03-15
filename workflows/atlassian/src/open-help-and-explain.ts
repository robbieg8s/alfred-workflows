import { openUrl } from "@halfyak/alfred-workflows-jxa";

import { hostFromUrl } from "./sundry.ts";
import { helpAdd } from "./urls.ts";

export const openHelpAndExplain = () => {
  openUrl(helpAdd);
  return `The Configuration Help page has been opened in your browser. The tab is served from ${hostFromUrl(helpAdd)}.`;
};
