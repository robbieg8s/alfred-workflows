// See Global Properties on
// https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html#//apple_ref/doc/uid/TP40014508-CH109-SW2

declare const jxaPathTag: unique symbol;
/**
 * An opaque type for the return value of the Path global.
 *
 * This permits typechecking the common error of passing a string, rather than a
 * Path, to a displayDialog.
 */
export type JxaPath = {
  readonly [jxaPathTag]: true;
};

declare global {
  // This is the namespace which the Objective-C bridge functions get bound into
  const $: any;
  // This provides the Obj.import function, plus some other utilities
  const ObjC: any;
  // This is the global which is used for the handler when invoking js via an osascript #!
  let run: (argv: string[]) => string;
  // This is the global for accessing scripting additions
  const Application: any;
  // This is the global for manipulating the filesystem
  const Path: (path: string) => JxaPath;
}

// Force this file to be a module
export {};
