// Utilities for manipulating the OSX clipboard

// It seems the globals from "@halfyak/alfred-workflows-jxa" are automatically
// imported by typescript since we depend on the package.

ObjC.import("AppKit");

const plainText = "public.utf8-plain-text";

export const readClipboard = (): string | undefined => {
  const pasteboard = $.NSPasteboard.generalPasteboard;
  // Just take the first item - there's usually only one, and i don't have a
  // better plan if there are multiple items. Use firstObject because it returns
  // nil for empty (and doesn't throw).
  const pasteboardItem = pasteboard.pasteboardItems.firstObject;
  if (undefined === pasteboardItem.js) {
    return undefined;
  } else {
    const pasteboardItemString = pasteboardItem.stringForType(plainText);
    // Note this can also be undefined if the item cannot be stringified
    return pasteboardItemString.js;
  }
};

export const writeClipboard = (text: string) => {
  const pasteboardItem = $.NSPasteboardItem.alloc.init;
  if (!pasteboardItem.setStringForType(text, plainText)) {
    throw new Error(`Could not set pasteboard '${plainText}' content`);
  } else {
    const pasteboard = $.NSPasteboard.generalPasteboard;
    pasteboard.clearContents;
    if (!pasteboard.writeObjects($.NSArray.arrayWithObject(pasteboardItem))) {
      throw new Error("Could not writeObjects to pasteboard");
    }
  }
};
