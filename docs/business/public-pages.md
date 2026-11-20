# Public pages

The pages anyone can read without signing in.

## Rules

- **R-PUB-1** Landing page: a classic Discord bot landing page, with a presentation of the bot, its features and an invite button. Its texts:

  | Part          | Text                                                                                                     |
  | ------------- | -------------------------------------------------------------------------------------------------------- |
  | Title         | Welcome every new member                                                                                 |
  | Subtitle      | Welcomer posts your welcome and goodbye messages, with embeds and a custom image, set up in a few clicks. |
  | Buttons       | Add to Discord · Open the dashboard                                                                      |
  | Feature 1     | **Welcome and goodbye messages.** Text and up to 10 embeds, with variables for the member and the server. |
  | Feature 2     | **Custom images.** The member's avatar and name on a card, with your colours, fonts and background.     |
  | Feature 3     | **Live preview.** See the message as Discord shows it before you save it.                                |
  | Feature 4     | **Statistics.** Arrivals, departures and messages sent, from the last day to all time.                   |
  | Feature 5     | **Always on.** The public status page shows whether the bot works, for every server.                     |
  | Last call     | Ready to welcome your members? · Add to Discord                                                          |
- **R-PUB-11** Identity of the product: name "Welcomer", address welcomer.app, support server https://discord.gg/7TGc5ZZ7aM. Logo, icon, favicon and sharing image are the files in [assets](../assets/): [logo](../assets/logo.svg), [icon](../assets/icon.svg), [favicon](../assets/favicon.ico), [sharing image](../assets/opengraph-image.png).

### Status page

The status page shows the bot only, so that anyone knows at any time whether it works.

- **R-PUB-4** At the top, a summary: the overall state, the total number of servers, and since when the bot has been running.
- **R-PUB-5** The overall state follows the usual vocabulary of public status pages:
  - **Operational**: every Discord connection is online.
  - **Partial outage**: at least one connection is offline or connecting, so the servers it serves are not handled.
  - **Major outage**: no connection is online.
- **R-PUB-6** Then one line per Discord connection: its number, its state (online, connecting, offline), its response time, the number of servers it serves, the time of its last update.
- **R-PUB-7** A connection silent for more than 1 minute is shown offline.
- **R-PUB-8** A visitor enters a server identifier and sees which connection serves that server.
- **R-PUB-9** The page refreshes itself every 30 seconds.

## Examples

```gherkin
Rule: R-PUB-5 Overall state

  Example: One connection down
    Given the bot has 4 Discord connections
    And connection 2 has been silent for 2 minutes
    When a visitor opens the status page
    Then connection 2 is shown offline
    And the overall state is "Partial outage"

  Example: Every connection down
    Given every Discord connection has been silent for 2 minutes
    When a visitor opens the status page
    Then the overall state is "Major outage"
```
