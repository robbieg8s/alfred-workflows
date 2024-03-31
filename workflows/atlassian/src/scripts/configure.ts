import {
  scriptFilter,
  AlfredScriptFilterItem,
} from "@halfyak/alfred-workflows-jxa";
import { queryAllAccounts } from "../security.ts";

// The run global is declared in "@halfyak/alfred-workflows-jxa" - see api.d.ts
run = scriptFilter((): AlfredScriptFilterItem[] => {
  const accounts = queryAllAccounts();
  return [
    {
      title: "Add a new Atlassian Account",
      subtitle:
        "Select to browse to Atlassian Tokens page & show a dialog to continue.",
      // We put the api-tokens url here so that it can be cmd+C'd. In a future
      // refactor it would be nice to pass it through the workflow to centralize
      // it's value in code, but that currently depends on how rework to share
      // the two add account paths falls out.
      arg: "https://id.atlassian.com/manage-profile/security/api-tokens",
      icon: { path: "account.png" },
      variables: { action: "add" },
    },
    ...accounts
      // Sort by account name. This is using localeCompare for convenience, due
      // to the lack of String.compare.
      .toSorted((left, right) => left.account.localeCompare(right.account))
      .map(
        ({ account, details: { enabled } }): AlfredScriptFilterItem => ({
          title: account,
          subtitle: `Action to ${enabled ? "disable" : "enable"}, hold ⌘ for delete`,
          arg: account,
          icon: { path: enabled ? "enabled.png" : "disabled.png" },
          // We don't need a match element - Alfred word splits the domains which is
          // the way i want to match in practice.
          variables: { action: "toggle" },
          mods: {
            cmd: {
              subtitle: "Action to delete this account (no undo!)",
              variables: { action: "delete" },
            },
          },
        }),
      ),
  ];
});
