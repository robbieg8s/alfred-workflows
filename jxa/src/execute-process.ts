import { detailedError } from "./sundry.ts";

export const executeProcess = (
  executableFile: string,
  stdinString: string,
  ...executableArguments: string[]
) => {
  const stdinPipe = $.NSPipe.pipe;
  const stdoutPipe = $.NSPipe.pipe;
  const task = $.NSTask.alloc.init;
  if (!stdinPipe || !stdoutPipe || !task) {
    throw detailedError(
      "Cannot set up to execute NSTask",
      `System calls failed when setting up to execute NSTask. stdinPipe = ${stdinPipe}, stdoutPipe = ${stdoutPipe}, task = ${task}.`,
    );
  } else {
    task.executableURL = $.NSURL.fileURLWithPath(executableFile);
    // JXA automatically bridges the js array to the NSArray here
    task.arguments = executableArguments;
    task.standardInput = stdinPipe;
    task.standardOutput = stdoutPipe;
    // Let stderr go through to Alfred's debug window, and inherit the Alfred environment variables

    // JXA is complicated and baroque - this "boxed nil" $() is how you pass a variable pointer
    // See Implicit Pass-by-Reference on https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/Articles/OSX10-10.html#//apple_ref/doc/uid/TP40014508-CH109-SW1914508-CH109-SW1
    // If that link stops working, try searching the web for
    // "This boxed nil can be passed as an argument to an ObjC method that expects an argument passed by reference;
    // the runtime will automatically replace the inner nil pointer with the pointer returned by reference."
    const launchError = $();
    const ok = task.launchAndReturnError(launchError);
    if (!ok) {
      throw detailedError(
        "Failed to launch NSTask",
        `The executable '${executableFile}' failed to launch. The macOS error was (${launchError.code}) '${launchError.localizedDescription.js}'.`,
      );
    } else {
      // The $() here is some more JXA - boxing the js string so we can call NSString.dataUsingEncoding
      const stdinData = $(stdinString).dataUsingEncoding(
        $.NSUTF8StringEncoding,
      );
      // Yes, there's a bug here - the write could block if the NSTask can't consume all of stdin before
      // enough stdout is read. We should have a more reactive API, but current use cases are small enough.
      stdinPipe.fileHandleForWriting.writeData(stdinData);
      stdinPipe.fileHandleForWriting.closeFile;
      const stdoutData = stdoutPipe.fileHandleForReading.readDataToEndOfFile;
      const stdoutString = $.NSString.alloc.initWithDataEncoding(
        stdoutData,
        $.NSUTF8StringEncoding,
      ).js;
      task.waitUntilExit;
      const exitCode = task.terminationStatus;
      if (exitCode != 0) {
        console.log(
          `Nonzero status ${exitCode} for '${executableFile}', stderr is above, stdout was:`,
        );
        console.log(stdoutString);
        throw detailedError(
          "Executable exit status nonzero",
          `The executable '${executableFile}' exited with status ${exitCode} which is nonzero. You can see stderr in the Alfred workflow debugger for the workflow. The executable stdout is there also.`,
        );
      } else {
        return stdoutString;
      }
    }
  }
};
