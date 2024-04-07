import {
  scriptFilter,
  AlfredScriptFilterItem,
} from "@halfyak/alfred-workflows-jxa";
import { queryAllAccounts } from "../security.ts";
import { connectItem, helpItem } from "../common-items.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((): AlfredScriptFilterItem[] => {
  const accounts = queryAllAccounts();
  return [
    connectItem,
    ...accounts
      // Sort by account name. This is using localeCompare for convenience, due
      // to the lack of String.compare.
      .toSorted((left, right) => left.account.localeCompare(right.account))
      .map(
        ({ account, details: { enabled } }): AlfredScriptFilterItem => ({
          title: account,
          subtitle: `${enabled ? "Disable" : "Enable"} this connection, hold ⌘ for disconnect.`,
          arg: account,
          icon: { path: enabled ? "enabled.png" : "disabled.png" },
          // We don't need a match element - Alfred word splits the domains which is
          // the way i want to match in practice.
          variables: { action: "toggle" },
          mods: {
            cmd: {
              subtitle: "Disconnect this account.",
              variables: { action: "disconnect" },
            },
          },
        }),
      ),
    helpItem,
  ];
});
