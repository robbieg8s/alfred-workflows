// Helpers for the Security Framework
// This is still specific to this workflow however, e.g. halfyakService

import { detailedError } from "@halfyak/alfred-workflows-jxa";

import {
  cf2ns,
  cfData,
  cfString,
  createCFDictionary,
  halfyakService,
  nsDataUtf8ToString,
} from "./sundry.ts";

ObjC.import("Security");

const securityError = (
  message: string,
  secFunction: string,
  resultCode: unknown,
  ...details: string[]
) => {
  const secErrorMessage = cf2ns(
    $.SecCopyErrorMessageString(resultCode, null),
  ).js;
  return detailedError(
    message,
    `${secFunction} return code ${resultCode}`,
    secErrorMessage,
    ...details,
  );
};

interface AccountItem {
  account: string;
  details: {
    enabled: boolean;
  };
}

const parseAccountItem = (keyChainObject: unknown): AccountItem => {
  // Account is an NSString, convert to js
  // @ts-expect-error This is a JXA type, i've not typed them yet
  const account = keyChainObject.valueForKey(cf2ns($.kSecAttrAccount)).js;
  // Generic is CFData, so convert it back to an NSString, then to js
  const generic = nsDataUtf8ToString(
    // @ts-expect-error This is a JXA type, i've not typed them yet
    keyChainObject.valueForKey(cf2ns($.kSecAttrGeneric)),
  );
  const details = JSON.parse(generic);
  return { account, details };
};

// Helpers for building macOS Security Framework queries
export const securityDictionary = (...kv: [unknown, unknown][]) =>
  createCFDictionary(
    [$.kSecClass, $.kSecClassGenericPassword],
    [$.kSecAttrService, halfyakService],
    ...kv,
  );
const withAccount = (account: string): [unknown, unknown] => [
  $.kSecAttrAccount,
  cfString(account),
];
const withLimit = (limit: unknown): [unknown, unknown] => [
  $.kSecMatchLimit,
  limit,
];
const withLimitOne = (): [unknown, unknown] => withLimit($.kSecMatchLimitOne);
const withGeneric = (details: object): [unknown, unknown] => [
  $.kSecAttrGeneric,
  cfData(JSON.stringify(details)),
];
const withToken = (token: string): [unknown, unknown] => [
  $.kSecValueData,
  cfData(token),
];
const returnAttributes = (): [unknown, unknown] => [
  $.kSecReturnAttributes,
  $.kCFBooleanTrue,
];

/**
 * Create a Keychain item for given account.
 *
 * Returns true on success, false if the item already exists.
 */
export const createAccount = (accountItem: AccountItem, token: string) => {
  const { account, details } = accountItem;
  const attributes = securityDictionary(
    withAccount(account),
    withGeneric(details),
    withToken(token),
  );
  const resultCode = $.SecItemAdd(attributes, null);
  if ($.errSecDuplicateItem === resultCode.toString()) {
    return false;
  } else if (0 !== resultCode) {
    throw securityError(
      `Failed creating Keychain item for ${account}`,
      "SecItemAdd",
      resultCode,
    );
  } else {
    return true;
  }
};

/**
 * Return a list of all Keychain items for the service, or [] if none are found.
 */
export const queryAllAccounts = (): AccountItem[] => {
  const query = securityDictionary(
    withLimit($.kSecMatchLimitAll),
    returnAttributes(),
  );
  const result = $();
  const resultCode = $.SecItemCopyMatching(query, result);
  if ($.errSecItemNotFound === resultCode.toString()) {
    // Report no items found
    return [];
  } else if (0 !== resultCode) {
    throw securityError(
      "Cannot query Keychain",
      "SecItemCopyMatching",
      resultCode,
    );
  } else {
    // Result is an NSArray of our matching accounts because kSecMatchLimitAll,
    // return a list of each converted item.
    return result.js.map(parseAccountItem);
  }
};

/**
 * Return the single Keychain item for given account, or undefined if not
 * found.
 */
export const queryAccountDetails = (account: string) => {
  const query = securityDictionary(
    withAccount(account),
    withLimitOne(),
    returnAttributes(),
  );
  const result = $();
  const resultCode = $.SecItemCopyMatching(query, result);
  if ($.errSecItemNotFound === resultCode.toString()) {
    return undefined;
  } else if (0 !== resultCode) {
    throw securityError(
      `Failed querying Keychain for ${account}`,
      "SecItemCopyMatching",
      resultCode,
    );
  } else {
    // Result is the item (because kSecMatchLimitOne)
    return parseAccountItem(result);
  }
};

/**
 * Return the token for given account, or undefined if not found.
 */
export const queryAccountToken = (account: string) => {
  const query = securityDictionary(withAccount(account), withLimitOne(), [
    $.kSecReturnData,
    $.kCFBooleanTrue,
  ]);
  const result = $();
  const resultCode = $.SecItemCopyMatching(query, result);
  if ($.errSecItemNotFound === resultCode.toString()) {
    return undefined;
  } else if (0 !== resultCode) {
    throw securityError(
      `Failed querying Keychain for ${account}`,
      "SecItemCopyMatching",
      resultCode,
    );
  } else {
    // Since we asked for just kSecReturnData, the result is the CFData, which
    // NSString can decode for us.
    return nsDataUtf8ToString(result);
  }
};

/**
 * Update the details in the Keychain item for given account.
 */
export const updateAccountDetails = (accountItem: AccountItem) => {
  const { account, details } = accountItem;
  const query = securityDictionary(withAccount(account));
  const attributesToUpdate = createCFDictionary(withGeneric(details));
  const resultCode = $.SecItemUpdate(query, attributesToUpdate);
  if (0 !== resultCode) {
    throw securityError(
      `Failed updating details in Keychain for ${account}`,
      "SecItemUpdate",
      resultCode,
    );
  }
};

/**
 * Update the token in the Keychain item for given account.
 */
export const updateAccountToken = (account: string, token: string) => {
  const query = securityDictionary(withAccount(account));
  const attributesToUpdate = createCFDictionary(withToken(token));
  const resultCode = $.SecItemUpdate(query, attributesToUpdate);
  if (0 !== resultCode) {
    throw securityError(
      `Failed updating token in Keychain for ${account}`,
      "SecItemUpdate",
      resultCode,
    );
  }
};

/**
 * Delete the Keychain item for given account.
 */
export const deleteAccount = (account: string) => {
  const query = securityDictionary(withAccount(account), withLimitOne());
  const resultCode = $.SecItemDelete(query);
  if (0 !== resultCode) {
    throw securityError(
      `Failed deleting Keychain item for ${account}`,
      "SecItemDelete",
      resultCode,
    );
  }
};
