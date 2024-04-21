import {
  detailedError,
  runScript,
  switchTo,
} from "@halfyak/alfred-workflows-jxa";

import { Choice } from "../choice.js";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((query) => {
  if (undefined === query) {
    throw detailedError("Missing required parameter 'query'");
  }
  const { bundleIdentifier, processId, windowId } = JSON.parse(query) as Choice;
  const application = new Application(bundleIdentifier);
  const windows = application.windows().filter((window) => {
    try {
      // It's important that this happens inside the try, some apps pass back
      // some window objects which don't work correctly - e.g. Dash does this.
      return windowId === window.id();
    } catch (_) {
      // Just ignore broken windows here - they would have been flagged by
      // window-chooser.ts which feeds this script.
      return false;
    }
  });
  const windowsCount = windows.length;
  if (0 === windowsCount) {
    throw detailedError("Cannot find window - maybe it closed?");
  } else if (1 !== windowsCount) {
    throw detailedError(`Found multiple (${windowsCount}) matching windows?`);
  } else {
    const [window] = windows;
    // Empirically, this will unminimize the window also if needed, as well as
    // bringing it to the front of the application's windows.
    window.index = 1;
    // Then switch to the other application
    switchTo(processId);
  }
});
