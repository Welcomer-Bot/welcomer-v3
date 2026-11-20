# Bot commands

The commands members type in Discord.

## Rules

Every answer of a command is seen only by the member who typed it.

- **R-CMD-1** `/help` gives help on the bot. Sections: a setup guide, the list of variables. It links to the dashboard and to the support server. More sections may be added when needed.

  | Section   | Text                                                                                                                                                                                                   |
  | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Title     | Welcomer help                                                                                                                                                                                          |
  | Setup     | 1. Open the dashboard and sign in with Discord. 2. Pick this server. 3. Create a welcome or goodbye configuration: channel, text, embeds. 4. Validate it, then activate it. 5. Type `/test` to see it. |
  | Variables | the list of [variables](./messages.md#variables), each with what it shows                                                                                                                              |
  | Links     | Dashboard · Support server                                                                                                                                                                             |

- **R-CMD-2** `/status` gives the state of the bot: connected or not, response time (the average of its Discord connections), running since when and memory used (both for the part of the bot that sends the messages), and which Discord connection serves this server.
- **R-CMD-3** `/test` lets a server manager test the active configuration of a message type (welcome or goodbye), in its validated version, in conditions close to a real arrival or departure, with the manager as the member. The manager chooses the message type; it is required. Only members who can manage the server can use `/test`, and only in a server. Channel variables take the configured channel.
- **R-CMD-4** Only the manager who ran `/test` sees the test message, in the channel where they typed it.
- **R-CMD-5** A test does not count in the statistics.

## Examples

```gherkin
Rule: R-CMD-3 Test uses the validated version

  Example: Draft not yet validated
    Given the active welcome configuration says "Hello"
    And a manager has a draft that says "Hi"
    When the manager types "/test welcome"
    Then only the manager sees "Hello"
    And the statistics do not change

  Example: No active configuration
    Given no goodbye configuration is active
    When the manager types "/test goodbye"
    Then the bot answers, to the manager only, that no goodbye configuration is active
```
