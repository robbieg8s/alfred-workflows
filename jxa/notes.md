This file is facts i have read about, collated, or discovered, about the
Objective-C bridge, JXA, and osascript's JavaScript.

# Enum constants are strings, even for integral enums

See [this Apple documentation for `NSUTF8StringEncoding`](https://developer.apple.com/documentation/foundation/1497293-string_encodings/nsutf8stringencoding) or [this Apple documentation for `errSecItemNotFound`](https://developer.apple.com/documentation/security/1542001-security_framework_result_codes/errsecitemnotfound) and then observe:

    :; osascript -lJavaScript -e '$.NSUTF8StringEncoding'
    4
    :; osascript -lJavaScript -e 'typeof $.NSUTF8StringEncoding'
    string
    :; osascript -lJavaScript -e 'ObjC.import("Security"); $.errSecItemNotFound'
    -25300
    :; osascript -lJavaScript -e 'ObjC.import("Security"); typeof $.errSecItemNotFound'
    string

This is particular vexing when you discover that functions that return these
enums, such as [`SecItemAdd`](https://developer.apple.com/documentation/security/1401659-secitemadd?language=objc) which returns `OSStatus`, do return `number` not `string`:

    :; osascript -lJavaScript -e 'ObjC.import("Security"); typeof $.SecItemAdd(null, null)'
    number

which, in turn, means care must be taken when checking for specific return codes
via the constants.
