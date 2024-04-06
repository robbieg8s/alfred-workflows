import {
  AlfredScriptFilterItem,
  scriptFilter,
} from "@halfyak/alfred-workflows-jxa";

import { queryAccountToken, queryAllAccounts } from "../security.ts";
import {
  halfyakService,
  nsDataUtf8ToString,
  siteFromUrl,
  stringToNSDataUtf8,
} from "../sundry.ts";

import activityQuery from "../activityQuery.graphql";

const createUserDateFormatter = () => {
  const dateFormatter = $.NSDateFormatter.alloc.init;
  dateFormatter.dateFormat =
    $.NSDateFormatter.dateFormatFromTemplateOptionsLocale(
      "HmEdMMM",
      0,
      $.NSLocale.currentLocale,
    );
  return (nsDate: unknown) => dateFormatter.stringFromDate(nsDate).js;
};

const createAtlassianTimestampParser = () => {
  // It appears NSISO8601DateFormatter does not understand the fractions of
  // seconds that api.atlassian.com returns in timestamps, despite these being
  // ok by https://www.rfc-editor.org/rfc/rfc3339, also to be fair 5.3 does call
  // this out as a rarely used option, and observe that using such "is likely to
  // cause interoperability problems".
  const dateFormatter = $.NSISO8601DateFormatter.alloc.init;
  // RFC 3339 seems to permit , or . in full generality, but since they occur
  // nowhere else in the ABNF, we can just wipe out those portions. The
  // advantage of this approach is that NSISO8601DateFormatter does the timezone
  // handling.
  const fractionRe = /[.,]\d+/;
  return (timestamp: string) =>
    dateFormatter.dateFromString(timestamp.replace(fractionRe, ""));
};

const getApiTimeout = () => {
  const timeout = parseInt(
    $.NSProcessInfo.processInfo.environment.valueForKey("API_TIMEOUT").js,
  );
  return !Number.isNaN(timeout) ? timeout : 60;
};

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((): AlfredScriptFilterItem[] => {
  const accountItems = queryAllAccounts();
  if (0 === accountItems.length) {
    return [
      {
        title: "No Atlassian Token - Connect an Atlassian Account?",
        subtitle:
          "Action this to browse to the Atlassian Tokens page & show a dialog to set up a connection.",
        icon: { path: "account.png" },
      },
    ];
  } else {
    const enabledAccountItems = accountItems.filter(
      ({ details: { enabled } }) => enabled,
    );
    if (0 === enabledAccountItems.length) {
      return [
        {
          title: "All connected Atlassian Accounts are disabled",
          subtitle: "Use the configuration workflow a? to toggle some on.",
          icon: { path: "disabled.png" },
          valid: false,
        },
      ];
    } else {
      // Although NSURLSession and all it's friends are documented as
      // Framework Foundation, they in fact seem to live in Cocoa.
      ObjC.import("Cocoa");

      const urlSession =
        $.NSURLSession.sessionWithConfigurationDelegateDelegateQueue(
          // Don't use persistent caching for anything
          $.NSURLSession.ephemeralSessionConfiguration,
          null,
          // This ensures the completion handlers for the url data tasks are
          // executed on the run loop which we will service to wait for them.
          $.NSOperationQueue.currentQueue,
        );

      // We'll populate these results from the completion handlers
      const dataByAccount = new Map();
      const errorByAccount = new Map();

      const dataTasks = enabledAccountItems.map(({ account }) => {
        const authorization = stringToNSDataUtf8(
          `${account}:${queryAccountToken(account)}`,
        ).base64EncodedStringWithOptions(0).js;
        const urlRequest = $.NSMutableURLRequest.alloc.init;
        urlRequest.HTTPMethod = "POST";
        urlRequest.URL = $.NSURL.URLWithString(
          "https://api.atlassian.com/graphql",
        );
        const setHeader = (field: string, value: string) =>
          urlRequest.setValueForHTTPHeaderField(value, field);
        setHeader("content-type", "application/json");
        setHeader("user-agent", `${halfyakService}/robbie@halfyak.org`);
        setHeader("authorization", `Basic ${authorization}`);
        const body = {
          query: activityQuery,
          variables: { productFilter: ["jira", "confluence"] },
        };
        urlRequest.HTTPBody = stringToNSDataUtf8(JSON.stringify(body));

        return urlSession.dataTaskWithRequestCompletionHandler(
          urlRequest,
          // @ts-expect-error This is a JXA callback, i've not typed them yet
          (data, response, error) => {
            // We only report one error per account, so try to report the most
            // specific. This means we set the least specific first - start with
            // macOS errors, then HTTP by status code, and finally GraphQL.
            if (undefined !== error.js) {
              errorByAccount.set(
                account,
                `(${error.code}): ${error.localizedDescription.js}`,
              );
            }
            if (undefined !== data.js) {
              const jsonData = JSON.parse(nsDataUtf8ToString(data));
              const { statusCode } = response;
              if (200 != statusCode) {
                console.log(JSON.stringify(jsonData, null, 2));
                // There doesn't appear to be complete consistency in which
                // field is filled in here, it depends on which bit of Atlassian
                // cloud rejects the request.
                const { message, error } = jsonData;
                const reportable =
                  message ??
                  error ??
                  $.NSHTTPURLResponse.localizedStringForStatusCode(statusCode);
                errorByAccount.set(
                  account,
                  `HTTP Status ${statusCode}: ${reportable}`,
                );
              } else {
                const { errors, data } = jsonData;
                if (undefined !== errors) {
                  errorByAccount.set(account, `GraphQL: ${errors[0].message}`);
                }
                if (undefined !== data) {
                  dataByAccount.set(account, data);
                }
              }
            }
          },
        );
      });
      dataTasks.map((dataTask) => dataTask.resume);
      // While NSOperationQueue.waitUntilAllOperationsAreFinished looks
      // attractive, it's no good here because there are no operations until the
      // completion handlers fire.
      // So just wait until nothing is running, or the timeout expires.  Note
      // that this test is not correct if we cancel or suspend tasks, but
      // neither is the whole loop.
      const timeoutCutoff =
        $.NSDate.now.dateByAddingTimeInterval(getApiTimeout());
      while (
        dataTasks.some(
          (dataTask) => $.NSURLSessionTaskStateRunning == dataTask.state,
        ) &&
        $.NSDate.now.timeIntervalSinceDate(timeoutCutoff) < 0
      ) {
        // Something still running, so let the run loop process completion
        // handlers. This does not yet have a timeout, although NSURLSession
        // does have a default at 60 seconds.
        $.NSRunLoop.currentRunLoop.acceptInputForModeBeforeDate(
          $.NSDefaultRunLoopMode,
          timeoutCutoff,
        );
      }
      // I think this is race free - NSURLSessionTaskStateCompleted is
      // documented with "the task's delegate receives no further callbacks",
      // and (1) we are servicing those delegates on this thread, because we set
      // the NSURLSession.delegateQueue, and (2) we've accepted all the input,
      // so if there was more to run, we'd have another callback.  Having said
      // that, it's not clear to me receiving a callback equals completing it,
      // although i was hoping that the use of the current thread makes this
      // work. I do think i've seen occasionally lost queries though.

      const userDateFormatter = createUserDateFormatter();
      const atlassianTimestampParser = createAtlassianTimestampParser();

      const renderConfluencePageOrBlogPost = (
        account: string,
        // @ts-expect-error This is GraphQL output, i've not typed that yet
        data,
        nsDate: unknown,
      ) => {
        const { base, webUi } = data.links;
        const site = siteFromUrl(base);
        return {
          title: data.title,
          subtitle: `in ${data.space.name} (${site}/${account}) on ${userDateFormatter(nsDate)}`,
          // Using NSURL.URLWithStringRelativeToURL to join doesn't work here,
          // since the returned webUi has a leading /, and the returned base has
          // a path component, and URLWithStringRelativeToURL strips the base
          // path component in this case.
          arg: base + webUi,
        };
      };
      const renderJiraIssue = (
        account: string,
        // @ts-expect-error This is GraphQL output, i've not typed that yet
        data,
        nsDate: unknown,
      ) => {
        const { webUrl, key, fieldsById } = data;
        return {
          // The 0 here is coupled to the fact we only request a single field,
          // namely summary, in the GraphQL.
          title: fieldsById.edges[0].node.text,
          subtitle: `${key} (${siteFromUrl(webUrl)}/${account}) on ${userDateFormatter(nsDate)}`,
          arg: webUrl,
        };
      };
      const renderersByTypename = new Map([
        ["ConfluenceBlogPost", renderConfluencePageOrBlogPost],
        ["ConfluencePage", renderConfluencePageOrBlogPost],
        ["JiraIssue", renderJiraIssue],
      ]);
      // We want to merge the data from all the requests
      const accountDataEntries = Array.from(dataByAccount.entries());
      const renderedActivityItems = accountDataEntries
        .flatMap(([account, data]) =>
          data.activity.myActivity.all.edges
            .map(
              // Unpack the GraphQL
              ({
                node: {
                  // @ts-expect-error This is GraphQL output, i've not typed that yet
                  event: { timestamp },
                  // @ts-expect-error This is GraphQL output, i've not typed that yet
                  object: { data },
                },
              }) => {
                if (null === data) {
                  // This happens, for example, when confluence pages are
                  // deleted.  There is a `trashed` event in the response, but
                  // its object has data null.
                  return undefined;
                } else {
                  const renderer = renderersByTypename.get(data.__typename);
                  if (undefined === renderer) {
                    // It's a type we don't support yet - for example the
                    // Confluence activity includes comments and whiteboard
                    // activity. Just discard it.
                    return undefined;
                  } else {
                    // We need to parse the timestamp to render the item, and
                    // also use the parsed form to get seconds since the epoch
                    // to facilitate sorting also.
                    const nsDate = atlassianTimestampParser(timestamp);
                    return {
                      item: renderer(account, data, nsDate),
                      seconds: nsDate.timeIntervalSince1970,
                    };
                  }
                }
              },
            )
            // Throw out the ones we discarded
            .filter((item: unknown) => undefined !== item),
        )
        // Sort by seconds since the epoch descending, that is to say,
        // most recent first.
        .toSorted((left, right) => right.seconds - left.seconds)
        .map(({ item }) => item);

      const accountErrorEntries = Array.from(errorByAccount.entries());
      const renderedErrors = accountErrorEntries.map(([account, error]) => ({
        title: `${account}: failure contacting Atlassian cloud services`,
        subtitle: error,
        valid: false,
      }));

      // This might have double ups - but at worst that will be a neglible performance penantly in a rare case
      const dataOrErrorAccounts = [
        ...accountDataEntries,
        ...accountErrorEntries,
      ].map(([account]) => account);
      const renderedTimeouts = enabledAccountItems
        .filter(({ account }) => !dataOrErrorAccounts.includes(account))
        .map(({ account }) => ({
          title: `${account}: timed out contacting Atlassian cloud services`,
          valid: false,
        }));
      return [...renderedErrors, ...renderedTimeouts, ...renderedActivityItems];
    }
  }
});
