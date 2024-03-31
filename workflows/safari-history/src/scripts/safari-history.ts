import {
  executeProcess,
  scriptFilter,
  AlfredScriptFilterItem,
} from "@halfyak/alfred-workflows-jxa";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((query): AlfredScriptFilterItem[] => {
  const home = $.NSHomeDirectory().js;
  const defaultHistoryDb = `${home}/Library/Safari/History.db`;
  // Safari profiles have separate dbs. Also not every directory here has a
  // History.db for me, so silently ignore directories without a db.
  const safariProfilesRoot = `${home}/Library/Containers/com.apple.Safari/Data/Library/Safari/Profiles`;
  const error = $();
  const profileDirs =
    $.NSFileManager.defaultManager.contentsOfDirectoryAtPathError(
      safariProfilesRoot,
      error,
    ).js;
  if (undefined === profileDirs) {
    throw new Error(
      `contentsOfDirectoryAtPathError (${error.code}): ${error.localizedDescription.js}`,
    );
  }
  const profileHistoryDbs = profileDirs
    .map(ObjC.unwrap)
    .flatMap((profileName: string) => {
      const profileHistoryDb = `${safariProfilesRoot}/${profileName}/History.db`;
      return $.NSFileManager.defaultManager.fileExistsAtPath(profileHistoryDb)
        ? [profileHistoryDb]
        : [];
    });

  const whereClause = () =>
    undefined === query
      ? ""
      : `WHERE history_visits.title LIKE '%${query.replaceAll("'", "''")}%'`;
  const sql = `
      SELECT history_visits.title, history_items.url, history_visits.visit_time
      FROM history_visits
      JOIN history_items ON history_items.id = history_visits.history_item
      ${whereClause()}
      GROUP BY title
      ORDER BY history_visits.visit_time DESC
      LIMIT 10;`;

  // Consider prioritising results from the most recent browser session:
  // `defaults read com.apple.Safari SafariProfilesLastActiveProfileUUIDString`
  // which is either a UUID or `DefaultProfile`. Also, this grabs 10 per
  // profile linearly in the profile, which will be slow for many profiles.
  // Maybe there should be a mode that only checks default and most recent if
  // not default?
  const historyItems = [defaultHistoryDb, ...profileHistoryDbs]
    .flatMap((safariHistoryDb) => {
      const jsonResult = executeProcess(
        "/usr/bin/sqlite3",
        sql,
        "-readonly",
        safariHistoryDb,
        "-batch",
        "-json",
      );
      return "" === jsonResult
        ? // When sqlite finds nothing in JSON mode, it emits nothing, as opposed to
          // an empty list.
          []
        : // The as here couples correctness to the sql query above and the
          // behaviour of sqlite. It'd be nicer to be careful but historically
          // it hasn't been a source of problems.
          (JSON.parse(jsonResult) as Array<{
            title: string;
            url: string;
            visit_time: number;
          }>);
    })
    .toSorted((left, right) => right.visit_time - left.visit_time);
  const dateFormatter = $.NSDateFormatter.alloc.init;
  dateFormatter.dateStyle = $.NSDateFormatterShortStyle;
  dateFormatter.timeStyle = $.NSDateFormatterShortStyle;
  dateFormatter.dateFormat =
    $.NSDateFormatter.dateFormatFromTemplateOptionsLocale(
      "HmEdMMM",
      0,
      $.NSLocale.currentLocale,
    );
  const formatDate = (time: number) =>
    dateFormatter.stringFromDate(
      $.NSDate.dateWithTimeIntervalSinceReferenceDate(time),
    ).js;
  return 0 === historyItems.length
    ? [{ title: "Nothing matching", valid: false }]
    : historyItems.map(({ title, url, visit_time }) => ({
        title,
        // osascript does not appear to provide the standard URL class. We
        // could use NSURL, but for now this parsing, a string split, is ok.
        subtitle: `${url.split("/")[2]} - ${formatDate(visit_time)}`,
        arg: url,
      }));
});
