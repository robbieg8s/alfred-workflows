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
    // We set the index, bringing the window to the front of the application's windows, and
    // also clean any miniaturization. Empirically the former is often enough, but if all a
    // applications windows are miniaturized, setting miniaturized is also necessary.
    window.index = 1;
    window.miniaturized = false;
    // Then switch to the other application
    switchTo(processId);
  }
});
