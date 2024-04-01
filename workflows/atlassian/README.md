# Atlassian workflow

This workflow provides search of activity on Atlassian Cloud Confluence and
Jira.

This workflow provides two keywords:

- `aa` which searches recent Atlassian Activity
- `a?` which is used to configure this workflow

In order to use the workflow, an Atlassian API token must be provided. The
workflow will lead you through the process, and full details are provided
in [docs/Configuration.md](docs/Configuration.md).

Searches are performed by requesting all activity from the Atlassian API
gateway's GraphQL endpoint, and then Alfred filters the results locally.

## Security

Tokens are stored in the macOS Keychain, which provides basic security, but an
Attacker able to run processes on your computer could obtain them.
