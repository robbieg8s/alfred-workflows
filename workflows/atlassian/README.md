# Halfyak Atlassian workflow for Alfred

This workflow provides search of activity on Atlassian Cloud Confluence and
Jira.

This workflow is not affiliated with either Alfred nor Atlassian, and in the
spirit of [this Atlassian documentation](https://www.atlassian.com/legal/trademark),
I wish to make clear this is a third party product and not a product offered
by Atlassian.

This workflow provides two keywords:

- `aa` which searches recent Atlassian Activity
- `a?` which is used to configure this workflow

In order to use the workflow, an Atlassian Account must be connected, by
providing an Atlassian API token to allow the workflow to make calls to
Atlassian Cloud systems. The workflow will lead you through the process,
and full details are provided in [docs/Configuration.md](docs/Configuration.md).

Searches are performed by requesting all activity from the Atlassian API
gateway's GraphQL endpoint, and then Alfred filters the results locally.

## Security

Tokens are stored in the macOS Keychain, which provides basic security, but an
Attacker able to run processes on your computer could obtain them.
