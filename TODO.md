Improvements that have occurred to me:

## Atlassian

- Use the Alfred Script Filter `match` field to allow filtering by account or
  site.
- There are two paths to add accounts - using `aa` with nothing configured, and
  also using `a?` in any case. These should share a bit more code at the
  typescript level. The flow when everything is disabled could similarly lead
  the user more immediately to a fix.
- Can you improve the type safety around displayDialog, specifically
  automatically inferring the `defaultAnswer`/`textReturned` correspondence, or
  the button names?

## Tooling

- Add a lint-workflow which checks package.json and info.plist are still sensibly in sync.
