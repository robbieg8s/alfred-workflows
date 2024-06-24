import {
  AlfredRunScriptJson,
  detailedError,
  nsDataUtf8ToString,
  runScript,
} from "@halfyak/alfred-workflows-jxa";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((filePath): AlfredRunScriptJson => {
  if (undefined === filePath) {
    throw detailedError("Missing required parameter 'filePath'");
  }
  const data = $.NSData.dataWithContentsOfFile(filePath);
  return { arg: nsDataUtf8ToString(data) };
});
