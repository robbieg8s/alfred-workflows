ObjC.import("AppKit");

export const openUrl = (url: string) =>
  $.NSWorkspace.sharedWorkspace.openURL($.NSURL.URLWithString(url));
