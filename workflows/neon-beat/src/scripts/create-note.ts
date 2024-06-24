import {
  AlfredRunScriptJson,
  detailedError,
  getEnvOrThrow,
  runScript,
  stringToNSDataUtf8,
  writeClipboard,
} from "@halfyak/alfred-workflows-jxa";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = runScript((note): AlfredRunScriptJson => {
  if (undefined === note) {
    throw detailedError("Missing required parameter 'note'");
  }
  const normalizedNote = note.trim() + "\n";
  if (2 > normalizedNote.length) {
    return { arg: "Discarding empty note" };
  }
  const notesFolder = getEnvOrThrow("NOTES_FOLDER");
  const folderError = $();
  const folderOk =
    $.NSFileManager.defaultManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(
      notesFolder,
      true, // Do create intermediate directories
      $(), // Pass nil for default attributes
      folderError,
    );
  if (!folderOk) {
    throw detailedError(
      `Cannot create "${notesFolder}"`,
      `Error (${folderError.code}) '${folderError.localizedDescription.js}'.`,
    );
  }
  const now = $.NSDate.date;
  const dateFormatter = $.NSDateFormatter.alloc.init;
  dateFormatter.locale = $.NSLocale.currentLocale;
  dateFormatter.dateFormat = "yyyy-MM-dd-E-HH-mm";
  const timestamp = dateFormatter.stringFromDate(now).js;
  // Slug use for file name
  const slug = normalizedNote
    // the first line
    .split("\n", 1)[0]
    // restricted to letters, numbers, and spaces,
    .replaceAll(/[^\p{L}\p{N}\p{Zs}]/gv, "")
    // then spaces converted to underscores
    .replaceAll(/\p{Zs}/gv, "_")
    // limited to at most 40 characters
    .slice(0, 40);
  const data = stringToNSDataUtf8(normalizedNote);
  for (let retry = 0; retry < 3; ++retry) {
    const filename = `${timestamp}${retry ? `_${retry}` : ""}_${slug}.txt`;
    const writeError = $();
    const filePath = `${notesFolder}/${filename}`;
    const writeOK = data.writeToFileOptionsError(
      filePath,
      $.NSDataWritingWithoutOverwriting,
      writeError,
    );
    if (writeOK) {
      writeClipboard(filePath);
      return { arg: `Saved ${notesFolder}/${filename}` };
    }
    console.log(
      `Write ${retry} (${filename}) failed. Error (${writeError.code}) '${writeError.localizedDescription.js}'.`,
    );
  }

  writeClipboard(note);
  return { arg: `Failed to create file, note saved on clipboard` };
});
