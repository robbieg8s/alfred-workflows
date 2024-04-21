import {
  AlfredScriptFilterItem,
  scriptFilter,
} from "@halfyak/alfred-workflows-jxa";

import { Choice } from "../choice.js";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((): AlfredScriptFilterItem[] => {
  const systemEvents = Application("System Events");
  return systemEvents
    .processes()
    .filter(
      (process) =>
        !process.backgroundOnly() && process.hasScriptingTerminology(),
    )
    .flatMap((process) => {
      try {
        const bundleIdentifier = process.bundleIdentifier();
        const application = new Application(bundleIdentifier);
        return application.windows().flatMap((window, index) => {
          try {
            // Only report windows which are visible or minimized (called
            // miniaturized in scripting terminology). Some apps keep around
            // invisible windows - e.g. Dash does this for it's About.
            // It's important that this happens inside the try, some apps
            // pass back some window objects which don't work correctly -
            // e.g. Dash does this.
            if (window.visible() || window.miniaturized()) {
              const windowName = window.name();
              const applicationName = application.name();
              // Some apps - e.g. Dash again - have no name for their
              // window, so show them as their application name, and suppress
              // the subtitle.
              const useWindowName = "" !== windowName;
              const title = useWindowName ? windowName : applicationName;
              const subtitle = useWindowName ? applicationName : undefined;
              const icon = {
                type: "fileicon",
                path: process.file().posixPath(),
              } as const;
              const match = [applicationName, windowName].join(" ");
              // The info we need to find the window after user selection
              const arg = JSON.stringify({
                bundleIdentifier,
                processId: process.unixId(),
                windowId: window.id(),
              } as Choice);
              return [{ title, subtitle, icon, match, arg }];
            } else {
              // Suppress windows like this
              return [];
            }
          } catch (error) {
            // Some apps reliably produce bad windows for which none of the
            // property getters work. I'm torn about whether to report these,
            // it'll be quite noisy, but noise in Alfred's debug window doesn't
            // hurt, and it might be useful debugging this for someone else?
            const message = error instanceof Error ? error.message : `${error}`;
            console.log(
              `WARNING: Cannot query window ${index} of application '${bundleIdentifier}': ${message}`,
            );
            return [];
          }
        });
      } catch (error) {
        const bundleIdentifier = process.bundleIdentifier();
        const message = error instanceof Error ? error.message : `${error}`;
        console.log(
          `WARNING: Cannot query application from process'${bundleIdentifier}': ${message}`,
        );
        return [];
      }
    });
});
