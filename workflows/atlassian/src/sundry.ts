// It seems the globals from "@halfyak/alfred-workflows-jxa" are automatically
// imported by typescript since we depend on the package.

// Athough CF and NS are toll-free bridge in Objective-C, they need a helping
// hand for JXA - i found this trick on https://stackoverflow.com/a/35007108
ObjC.bindFunction("CFMakeCollectable", ["id", ["void *"]]);
export const cf2ns = (cfThing: unknown) => $.CFMakeCollectable(cfThing);

export const stringToNSDataUtf8 = (string: string) =>
  $(string).dataUsingEncoding($.NSUTF8StringEncoding);

export const nsDataUtf8ToString = (nsdata: unknown): string =>
  $.NSString.alloc.initWithDataEncoding(nsdata, $.NSUTF8StringEncoding).js;

/**
 * Create a CFData from a javascript string.
 */
export const cfData = (data: string) =>
  // Use the "copy of bridge type" trick (see cfString) to make a CFData
  $.CFDataCreateCopy(null, stringToNSDataUtf8(data));

/**
 * Create a CFString from a javascript string.
 *
 * Empirically the security APIs require CF objects, and bridged ones are not
 * enough. We can make a copy of a bridged one though, and it works.
 */
export const cfString = (string: string) =>
  $.CFStringCreateCopy(null, $(string));

export const createCFDictionary = (...kv: [unknown, unknown][]) => {
  const dictionary = $.CFDictionaryCreateMutable(null, kv.length, null, null);
  kv.forEach(([key, value]) => {
    $.CFDictionaryAddValue(dictionary, key, value);
  });
  return dictionary;
};

/**
 * The kSecAttrService value for this workflow's keychain items.
 *
 * Empirically the security APIs require CF objects, and bridged ones are not
 * enough. We can make a copy of a bridged on though, and it works.
 */
export const halfyakService = cfString("org.halfyak.alfredapp.atlassian");

export const suggestedTokenLabel = () => {
  const application = Application.currentApplication();
  application.includeStandardAdditions = true;
  const { shortUserName, computerName } = application.systemInfo();
  return `Halfyak Atlassian workflow for Alfred, user ${shortUserName} on ${computerName}`;
};
