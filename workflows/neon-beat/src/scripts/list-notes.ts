import {
  AlfredScriptFilterItem,
  getEnvOrThrow,
  JxaBridged,
  scriptFilter,
} from "@halfyak/alfred-workflows-jxa";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((): AlfredScriptFilterItem[] => {
  const notesFolder = getEnvOrThrow("NOTES_FOLDER");
  // (NSDirectoryEnumerator<NSString *> *) enumeratorAtPath:(NSString *)path;
  // NSEnumerator @property(readonly, copy) NSArray<ObjectType> *allObjects;
  const fileNames: JxaBridged<JxaBridged<string>[]> =
    $.NSFileManager.defaultManager.enumeratorAtPath(notesFolder).allObjects;
  return fileNames.js
    .map((fileName) => fileName.js)
    .sort()
    .reverse()
    .map((file) => ({
      title: file,
      arg: `${notesFolder}/${file}`,
    }));
});
