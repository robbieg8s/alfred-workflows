Improvements that have occurred to me:

## Atlassian

- Add Documentation for basic usage. Markdown in the repository is the easiest
  path here. Include specific Help:

  - for the create flow linked from a button in that dialog,
  - for the update token flow linked from a button in that dialog,
  - for the configuration flow linke from an item under `a?`

- Use the Alfred Script Filter `match` field to allow filtering by account or
  site.
- Make the number of results configurable. This is a little bit tricky because
  the activity endpoint doesn't have a text content filter, so all the text
  based filtering is done in Alfred.
- Add a more meaningful timeout to the api.atlassian.com requests.
- There are two paths to add accounts - using `aa` with nothing configured, and
  also using `a?` in any case. These should share a bit more code at the
  typescript level. The flow when everything is disabled could similarly lead
  the user more immediately to a fix.
- Can you improve the type safety around displayDialog, specifically
  automatically inferring the `defaultAnswer`/`textReturned` correspondence, or
  the button names?

## Workflow Common

- Share the NSDateFormatter setup and usage between workflows.

## Tooling

- Add version bumping either to export-workflow or as a separate tool
- Add a lint-workflow which checks package.json and info.plist are still sensibly in sync.
