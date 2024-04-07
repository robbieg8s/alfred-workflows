import { atlassianApiTokens, helpConfiguration } from "./urls.ts";

export const connectItem = {
  title: "Connect an Atlassian Account",
  subtitle:
    "Browse to the Atlassian Tokens page & show a dialog to set up a connection.",
  // We put the api-tokens url here so that it can be cmd+C'd - actually opening
  // it is done from code in credentialsDialog.ts
  arg: atlassianApiTokens,
  icon: { path: "account.png" },
  variables: { action: "connect" },
};

export const helpItem = {
  title: "Show help for configuring connections",
  subtitle: "Browse to the help page about configuring this workflow.",
  arg: helpConfiguration,
  icon: { path: "help.png" },
  variables: { action: "help" },
};
