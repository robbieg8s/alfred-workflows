import { writeClipboard } from "@halfyak/alfred-workflows-jxa";

export const clearClipboardAndExplain = (actioned: string) => {
  // We clear the system clipboard to discard the token.
  writeClipboard("");
  // Of course, it might have also made it into Alfred's Clipboard History
  // feature, and there's no documented API for this. It can be done by
  // editing the Alfred sqlite database directly, but I'm leery of that.
  // https://www.alfredforum.com/topic/18702-clear-clipboard-history-and-clipboard/

  return `${actioned}\nSystem clipboard cleared - check clipboard history also.`;
};
