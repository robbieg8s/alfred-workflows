// It seems the globals from "@halfyak/alfred-workflows-jxa" are automatically
// imported by typescript since we depend on the package.

// Athough CF and NS are toll-free bridge in Objective-C, they need a helping
// hand for JXA - i found this trick on https://stackoverflow.com/a/35007108
import { stringToNSDataUtf8 } from "@halfyak/alfred-workflows-jxa";

ObjC.bindFunction("CFMakeCollectable", ["id", ["void *"]]);
export const cf2ns = (cfThing: unknown) => $.CFMakeCollectable(cfThing);

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

/**
 * Return the host from a url string.
 *
 * Empirically, osascript does not provide the JavaScript URL class. Really we
 * should implement it using NSURL, but for now this will do.
 */
export const hostFromUrl = (url: string) => url.split("/")[2];

/**
 * Return the lead dotted component of the host of a url, which is the site in
 * Atlassian terms for an Atlassian Cloud url.
 */
export const siteFromUrl = (url: string) => hostFromUrl(url).split(".")[0];

export const suggestedTokenLabel = () => {
  const application = Application.currentApplication();
  application.includeStandardAdditions = true;
  const { shortUserName, computerName } = application.systemInfo();
  return `Halfyak Atlassian workflow for Alfred, user ${shortUserName} on ${computerName}`;
};
