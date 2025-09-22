import {
  AlfredScriptFilterItem,
  scriptFilter,
} from "@halfyak/alfred-workflows-jxa";

// The effective JXA types for tabs and windows from known browser classes
// We don't bother with precisely typing below, this is just a union of the known methods.
interface BrowserTab {
  // Both
  url: () => string;
  // Safari browsers
  name: () => string;
  index: () => number;
  // Chromium browsers
  title: () => string;
}

interface BrowserWindow {
  // Safari browsers
  currentTab: () => BrowserTab;
  // Chromium browsers
  activeTabIndex: () => number;
  tabs: () => BrowserTab[];
}

interface BrowserHelpers {
  tabName: (tab: BrowserTab) => string;
  currentTabIndex: (window: BrowserWindow) => number;
}

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((): AlfredScriptFilterItem[] => {
  const chromiumHelpers: BrowserHelpers = {
    tabName: (tab: BrowserTab) => tab.title(),
    currentTabIndex: (window: BrowserWindow) => window.activeTabIndex(),
  };
  const safariHelpers: BrowserHelpers = {
    tabName: (tab: BrowserTab) => tab.name(),
    currentTabIndex: (window: BrowserWindow) => window.currentTab().index(),
  };

  const getApplicationByName = (name: string) => {
    try {
      return new Application(name);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      console.log(`Application ${name} not found: ${message}`);
      return undefined;
    }
  };

  const splitUrl = (url: string) => {
    const nsUrl = $.NSURL.URLWithString(url);
    const host = ObjC.unwrap(nsUrl.host);
    // While NSURL can fetch query and fragment, it doesn't make mutating them easy,
    // and since they are easy to do naively, we do it naively
    const queryIndex = url.indexOf("?");
    const queryRemoved =
      queryIndex == -1 ? undefined : url.substring(0, queryIndex);
    const fragmentIndex = url.indexOf("#");
    const fragmentRemoved =
      fragmentIndex == -1 ? undefined : url.substring(0, fragmentIndex);
    return { host, queryRemoved, fragmentRemoved };
  };

  const items = (
    [
      ["Brave", chromiumHelpers],
      ["Google Chrome", chromiumHelpers],
      ["Safari", safariHelpers],
      ["Safari Technology Preview", safariHelpers],
      ["Vivaldi", chromiumHelpers],
    ] as const
  )
    .flatMap(([browser, helpers]) => {
      const application = getApplicationByName(browser);
      if (!application) {
        // Cannot find by name - probably not installed - ignore
        return [];
      } else if (!application.running()) {
        // Browsers that aren't running have no tabs - if you query windows osascript will launch the
        // application to get the windows, so discard these directly
        return [];
      } else {
        // This IIFE avoids needing to know the type of application.windows(), which i'm having trouble
        // importing for reasons I haven't yet debugged.
        const windows = (() => {
          try {
            return application.windows();
          } catch (error) {
            // This can occur if automation is not enabled in system settings
            const message = error instanceof Error ? error.message : `${error}`;
            console.log(
              `Cannot get ${application.name()} windows, is Automation enabled for Alfred? : ${message}`,
            );
            return undefined;
          }
        })();

        if (windows == undefined) {
          return [];
        } else {
          return windows.flatMap((window) => {
            try {
              // Bridge from the JXA types to the duck typed browser window union above
              const browserWindow = window as unknown as BrowserWindow;
              const tabItems = browserWindow.tabs().map((tab) => ({
                title: helpers.tabName(tab),
                url: tab.url(),
              }));
              if (tabItems.length != 0) {
                // Pull the activeTab to the front of the list
                // yes, currentTabIndex appears to be 1 based in Chromium and Safari
                const [currentTab] = tabItems.splice(
                  helpers.currentTabIndex(browserWindow) - 1,
                  1,
                );
                tabItems.unshift(currentTab);
              } // else report no tabs, Vivaldi settings windows for example.
              return tabItems;
            } catch (error) {
              // Sometimes Safari ends up with windows that aren't on the screen (they don't even show
              // up in Hammerspoon queries for all windows), and afaics none of the member functions on
              // window work, so I can't find them without trying and failing.
              // Deem these to have no tabs.
              return [];
            }
          });
        }
      }
    })
    .map(({ title, url }) => {
      if (!url) {
        // This happens when a tab is unloaded, presumably for power or memory load reduction
        const invalidHelp = "Cannot read tab url - it may have been unloaded";
        return {
          title,
          match: title,
          subtitle: invalidHelp,
          valid: false,
        };
      } else {
        const { host, queryRemoved, fragmentRemoved } = splitUrl(url);
        const offerCmdHelp = queryRemoved ? " ?Query (Try ⌘)" : "";
        const offerAltHelp = fragmentRemoved ? " #Fragment (Try ⌥)" : "";
        const noModHelp = `${offerCmdHelp}${offerAltHelp}`;
        const cmdHelp = queryRemoved
          ? // Yes, fragmentRemoved changes query help, because query removal removes both
            ` ?Query${fragmentRemoved ? "#Fragment" : ""} removed (⌘)`
          : // And if there's no query, ignore cmd help and just offer alt help
            offerAltHelp;
        const altHelp = fragmentRemoved
          ? // Yes, queryRemoved changes fragment help, to keep reminder query string is present
            `${queryRemoved ? " ?Query kept (Try ⌘)" : ""} #Fragment removed (⌥)`
          : // And if there's no fragment, ignore alt help and just offer cmd help
            offerCmdHelp;

        return {
          title,
          // Data needed to render the final output
          arg: url,
          match: `${title} ${host ? host.replaceAll(".", " ") : ""}`,
          // You can't set the unmodified subtitle in the connection, so we need to set this one here
          subtitle: `${noModHelp}`,
          mods: {
            cmd: { arg: queryRemoved, subtitle: cmdHelp },
            alt: { arg: fragmentRemoved, subtitle: altHelp },
            "cmd+alt": { arg: queryRemoved, subtitle: cmdHelp },
          },
        };
      }
    });
  return 0 !== items.length
    ? items
    : [{ title: "No browser tabs found", valid: false }];
});
