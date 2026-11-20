# Editor

How a manager edits a configuration or an image, previews it and validates it.

## Rules

### Preview and checks

- **R-EDT-1** A manager edits a configuration on the dashboard and sees a preview of the message. The preview looks like the message in Discord: text and Discord formatting, embeds, mentions, custom emoji and the image.
- **R-EDT-2** The preview replaces the variables exactly like the bot. The member is the signed-in user; the server and the channel are those of the configuration.
- **R-EDT-3** The dashboard refuses to validate a message that breaks a rule of [messages](./messages.md): empty, or over a Discord limit in the worst case. It warns, without blocking, at 80% of a limit and for an unknown variable.
- **R-EDT-4** The dashboard warns, without blocking, when the bot lacks a permission it needs to post in the chosen channel: view the channel, send messages, embed links when the message has embeds, attach files when the configuration uses an image, attached or in the first embed.

### Draft and validation

- **R-EDT-5** Edits to a configuration or to an image are a draft that exists only on the dashboard. Members never see a draft. While a manager edits, arrivals and departures keep using the last validated version.
- **R-EDT-6** A draft is lost when the manager leaves the page. The dashboard asks for confirmation before leaving with unvalidated edits. _Cancel_ goes back to the last validated version.
- **R-EDT-7** A configuration and an image are validated separately. An image is edited in its own editor; the configuration only chooses it.
- **R-EDT-8** Validating a configuration saves its name, channel, message, chosen image and place of the image together, all or nothing. It never validates an image being edited.

### Editor layout

- **R-EDT-10** The channel list groups the channels by category, in Discord's order. Variables are inserted from a menu. Each error and warning shows next to its element, and a summary of them shows at the top.

### Two people at once

- **R-EDT-9** If two people edit the same configuration or image, the one who validates second is refused when it changed since they opened it. The dashboard says it was changed by someone else and offers to reload. Nobody overwrites another person's work without seeing it.
- **R-EDT-11** If a configuration or an image is deleted while someone else acts on it (validate, activate, choose it), the action is refused. The dashboard says it no longer exists and goes back to the list.

## Examples

```gherkin
Rule: R-EDT-5 A draft never reaches members

  Example: A member joins during an edit
    Given the active welcome configuration says "Hello"
    And the manager has changed it to "Hi" without validating
    When a member joins
    Then the bot posts "Hello"

Rule: R-EDT-8 Validation is all or nothing

  Example: Refused validation keeps the old version
    Given the manager changed the channel and made the message too long in the worst case
    When the manager validates
    Then nothing is saved
    And the bot keeps using the old channel and the old message

Rule: R-EDT-9 Second validation is refused

  Example: Two managers on the same configuration
    Given Alex and Sam open the configuration "Summer"
    When Alex validates a change
    And Sam then validates another change
    Then Sam's change is refused
    And the dashboard tells Sam it was changed by someone else and offers to reload
    And "Summer" holds Alex's change
```
