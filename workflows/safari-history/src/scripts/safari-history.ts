import { DetailedError, executeProcess } from "@halfyak/alfred-workflows-jxa";

// This global is declared (globally) in "@halfyak/alfred-workflows-jxa"
run = (argv: string[]) => {
  try {
    const home = $.NSHomeDirectory().js;
    const safariHistoryDb = `${home}/Library/Safari/History.db`;
    const whereClause = () =>
      0 == argv.length
        ? ""
        : `WHERE history_visits.title LIKE '%${argv[0].replaceAll("'", "''")}%'`;
    const sql = `
      SELECT history_visits.title, history_items.url, history_visits.visit_time
      FROM history_visits
      JOIN history_items ON history_items.id = history_visits.history_item
      ${whereClause()}
      GROUP BY title
      ORDER BY history_visits.visit_time DESC
      LIMIT 10;`;

    const jsonResult = executeProcess(
      "/usr/bin/sqlite3",
      sql,
      "-readonly",
      safariHistoryDb,
      "-batch",
      "-json",
    );
    const dateFormatter = $.NSDateFormatter.alloc.init;
    dateFormatter.dateStyle = $.NSDateFormatterShortStyle;
    dateFormatter.timeStyle = $.NSDateFormatterShortStyle;
    dateFormatter.dateFormat =
      $.NSDateFormatter.dateFormatFromTemplateOptionsLocale(
        "HmEdMMM",
        0,
        $.NSLocale.currentLocale,
      );
    // When sqlite finds nothing in JSON mode, it emits nothing, as opposed to an empty list.
    const items =
      "" === jsonResult
        ? [{ title: "Nothing matching", valid: false }]
        : (
            JSON.parse(jsonResult) as Array<{
              title: string;
              url: string;
              visit_time: number;
            }>
          ).map(({ title, url, visit_time }) => ({
            title,
            // osascript does not appear to provide the standard URL class. We
            // could use NSURL, but for this parsing, a string split will do.
            subtitle: `${url.split("/")[2]} - ${dateFormatter.stringFromDate($.NSDate.dateWithTimeIntervalSinceReferenceDate(visit_time)).js}`,
            arg: url,
          }));
    return JSON.stringify({ items });
  } catch (error) {
    if (error instanceof DetailedError) {
      console.log(error.details);
    }
    return JSON.stringify({
      items: [
        {
          title: "Internal Error",
          subtitle: error instanceof Error ? error.message : `${error}`,
          valid: false,
        },
      ],
    });
  }
};
