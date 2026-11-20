# Back-office

The part of the dashboard where admins find any server and manage it.

## Rules

- **R-ADM-1** Only admins reach the back-office, and only they see its link. Anyone else who tries is sent back to the dashboard home.
- **R-ADM-2** The Welcomer team keeps the list of admins outside the product. There is no page to manage it.
- **R-ADM-3** The back-office lists the servers where the bot is present, sorted by name, 50 per page. For each: name, identifier, member count, date the bot joined, active configuration of each type.
- **R-ADM-4** An admin searches a server by identifier or by name, with "name (identifier)" suggestions while typing.
- **R-ADM-5** From the list or the search, the admin opens the server's pages exactly as a server manager sees them, and has the same rights there: configurations, images, statistics, editing included. The [editor](./editor.md) rules apply to them like to a manager.
- **R-ADM-6** A server where the bot is absent cannot be opened, like for a manager.
- **R-ADM-7** Every change an admin makes on a server is written in the technical logs: when, which admin, which server, which configuration or image and its new version. The content of the change is never written ([privacy](./privacy.md), R-PRV-4).

## Examples

```gherkin
Rule: R-ADM-1 Back-office reserved for admins

  Example: A manager tries the back-office
    Given Alex is a server manager and not an admin
    When Alex opens the back-office
    Then Alex is sent back to the dashboard home

Rule: R-ADM-5 Admin manages like a manager

  Example: Admin edits a server they do not manage on Discord
    Given Jo is an admin and has no permission on the server
    And the bot is present on the server
    When Jo opens the server from the back-office and validates a configuration
    Then the configuration is saved
    And the technical logs record that Jo changed it
```
