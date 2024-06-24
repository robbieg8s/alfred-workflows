// See Global Properties on
// https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html#//apple_ref/doc/uid/TP40014508-CH109-SW2

import { Application, SystemEvents } from "./application.js";

// Some of this is inspired by https://github.com/JXA-userland/JXA, and maybe
// i should use that directly, but i need to understand it more fully first.

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

/**
 * A type which can be locally used to declare a bridge function return type using `as`.
 */
export type JxaBridged<T> = {
  js: T;
};

declare global {
  // This is the namespace which the Objective-C bridge functions get bound into
  const $: any;
  // This provides the Obj.import function, plus some other utilities
  const ObjC: any;
  /**
   * While this is mentioned on the Apple page above, it's not really documented, but empirically it delays by seconds.
   */
  const delay: (seconds: number) => undefined;
  // This is the global which is used for the handler when invoking js via an osascript #!
  let run: (argv: string[]) => string;
  // This is the global for accessing scripting additions
  const Application: {
    currentApplication: () => Application;
    new (bundleIdentifierOrName: string): Application;
    (bundleIdentifierOrName: string): Application;
    (name: "System Events"): Application & SystemEvents;
  };

  // This is the global for manipulating the filesystem
  const Path: (path: string) => JxaPath;
}

// Force this file to be a module
export {};
