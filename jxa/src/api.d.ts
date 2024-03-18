// See Global Properties on
// https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html#//apple_ref/doc/uid/TP40014508-CH109-SW2

declare global {
  // This is the namespace which the Objective-C bridge functions get bound into
  const $: any;
  // This provides the Obj.import function, plus some other utilities
  const ObjC: any;
  // This is the global which is used for the handler when invoking js via an osascript #!
  let run: (argv: string[]) => string;
}

// Force this file to be a module
export {};
