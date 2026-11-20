# Bot on a server

How the bot joins and leaves a server, and what it keeps about it.

## Rules

- **R-SRV-1** Any server manager can invite the bot to their server. From the dashboard, the invitation preselects the chosen server; from the landing page, the manager picks the server on Discord. The invitation opens in a new tab; back on the dashboard, the manager reloads the page to see the server.
- **R-SRV-2** The bot asks only for the permissions it needs: view channels, send messages, embed links, attach files.
- **R-SRV-3** When the bot joins a server, the server has no configuration and no image: nothing is sent until a manager creates and activates a configuration ([configurations](./configurations.md)).
- **R-SRV-4** The bot updates the server's member count on every arrival and every departure. After a departure, the count no longer includes the member who left.
- **R-SRV-5** When the bot leaves a server (kicked or removed), the server's configurations and images are deleted. Its statistics are kept ([statistics](./statistics.md)).
- **R-SRV-6** When the bot comes back to a server, it starts again from R-SRV-3, and the managers find the old statistics again.

## Examples

```gherkin
Rule: R-SRV-5 Leaving deletes the setup, not the statistics

  Example: Kicked, then invited again
    Given the server has 2 configurations, 1 image and 3 months of statistics
    When the bot is kicked from the server
    And a manager invites the bot again
    Then the server has no configuration and no image
    And the statistics page shows the 3 months of statistics
```
