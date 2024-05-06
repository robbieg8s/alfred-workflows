import { detailedError } from "./sundry.ts";

ObjC.import("AppKit");

export const openUrl = (url: string) => {
  const result = $.NSWorkspace.sharedWorkspace.openURL(
    $.NSURL.URLWithString(url),
  );
  // Empirically i need to insert a delay here to give the browser time to become frontmost.
  delay(0.1);
  return result;
};

export const switchTo = (pid: number) => {
  const other =
    $.NSRunningApplication.runningApplicationWithProcessIdentifier(pid);
  // To raise the app, we need to yield to it, and then activate it
  $.NSApplication.sharedApplication.yieldActivationToApplication(other);
  if (!other.activateWithOptions(0)) {
    throw detailedError("Failed to NSRunningApplication.activateWithOptions");
  }
};
