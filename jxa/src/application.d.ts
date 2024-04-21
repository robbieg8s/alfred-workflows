// Both DialogInquiry and DialogReply should have members, but i haven't got
// the type-checking here playing nicely with the wrapper in sundry.ts yet.
interface DialogInquiry {}
interface DialogReply {}

interface SystemInformation {
  computerName: string;
  shortUserName: string;
}

interface Window {
  id: () => number;
  set index(index: number);
  miniaturized: () => boolean;
  name: () => string;
  visible: () => boolean;
}

declare interface Application {
  displayDialog: (text: string, options: DialogInquiry) => DialogReply;
  set includeStandardAdditions(include: boolean);
  name: () => string;
  systemInfo: () => SystemInformation;
  windows: () => Window[];
}

declare interface File {
  posixPath: () => string;
}

declare interface Process {
  backgroundOnly: () => boolean;
  bundleIdentifier: () => string;
  file: () => File;
  hasScriptingTerminology: () => boolean;
  unixId: () => number;
}

declare interface SystemEvents {
  processes: () => Process[];
}

export { Application, SystemEvents };
