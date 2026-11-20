# Messages

What a message holds, the Discord limits it respects, and the variables it uses.

A message is what the bot posts for a configuration: a text, embeds and, optionally, the configuration's image.

## Rules

### What an embed holds

- **R-MSG-1** An embed can hold: a title, a description, a link, a color, an author (name, icon, link), a footer (text, icon), a thumbnail, an image, and fields (name, value, shown side by side or not). It holds nothing else, notably no date.
- **R-MSG-2** A color is an RGB color.
- **R-MSG-3** A link, an icon, a thumbnail or an image is a web link (http or https), or `{{member.avatar}}` alone (R-VAR-2). A link is 2,048 characters at most, a length set by Welcomer: Discord documents none.
- **R-MSG-4** A field has a name and a value, both required and not blank: Discord refuses a field without them.
- **R-MSG-12** An author icon needs an author name, and a footer icon needs a footer text: Discord requires the name of an author and the text of a footer ([Discord, embed object](https://docs.discord.com/developers/resources/message#embed-object)).

### Empty message

- **R-MSG-5** An embed is **not empty** when it has a title, a description, an author name or a footer text that is not blank, at least one field, an image or a thumbnail. A color or a link alone does not count.
- **R-MSG-6** A message is **not empty** when it has a text that is not blank, at least one embed that is not empty, or an image. A message must not be empty to be validated.

### Discord limits

- **R-MSG-7** A message always respects the Discord limits below, checked in the worst case (R-MSG-8).

  Source: Discord developer documentation, page "Message", sections "Create Message" and "Embed Limits".

  | Element                          | Limit            |
  | -------------------------------- | ---------------- |
  | Text of the message              | 2,000 characters |
  | Embeds per message               | 10               |
  | Embed title                      | 256 characters   |
  | Embed description                | 4,096 characters |
  | Fields per embed                 | 25               |
  | Field name                       | 256 characters   |
  | Field value                      | 1,024 characters |
  | Footer text                      | 2,048 characters |
  | Author name                      | 256 characters   |
  | Total of the texts of all embeds | 6,000 characters |

  The total counts, across all the embeds of a message, the titles, descriptions, field names, field values, footer texts and author names. Links and colors do not count.

- **R-MSG-8** Each limit is checked with every variable replaced by a text of its maximum length (R-VAR-4). A message that could exceed a limit in this worst case cannot be validated. Reason: a member with a long name would otherwise make the post fail.
- **R-MSG-9** The dashboard warns, without blocking, when the worst case reaches 80% of a limit.

### Default message

- **R-MSG-10** A new configuration starts with the default message of its type.

  | Type    | Text                                              | Embed                                                                                                                                           |
  | ------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
  | Welcome | `Welcome {{member.mention}} to {{server.name}}`   | title "Welcome to the server", description `Welcome {{member.mention}} to {{server.name}}`, field "Member count" = `{{server.memberCount}}`     |
  | Goodbye | `Goodbye {{member.mention}} from {{server.name}}` | title "Goodbye from the server", description `Goodbye {{member.mention}} from {{server.name}}`, field "Member count" = `{{server.memberCount}}` |

### Mentions

- **R-MSG-11** A message notifies only the member who arrives or leaves. It never notifies everyone, the members online, a role or another member, even when their mention is written in the message.

### Variables

A manager inserts variables in a message. The bot replaces each one when it posts the message. A variable is written with double braces and grouped by subject. Only the exact form is a variable: same case, no space inside the braces, and there is no way to escape braces.

- **R-VAR-1** Variables are replaced in all the texts of the message: the text, and in each embed the title, description, author name, footer text, field names and field values. Variables in a custom image follow [R-IMG-11](./images.md#texts).
- **R-VAR-2** A link (link, icon, thumbnail, image) accepts `{{member.avatar}}` only when it holds nothing else.
- **R-VAR-3** An unknown variable is shown as written. The dashboard warns about it without blocking.
- **R-VAR-4** Each variable has the maximum length below. A length marked "set by Welcomer" is not documented by Discord.

  | Variable                          | Replaced by                                                                                                                                                                        | Max length | Source of the length                                                    |
  | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
  | `{{member.mention}}`              | mention of the member                                                                                                                                                              | 23         | mention format around an identifier of 20 digits at most                |
  | `{{member.username}}`             | the member's username                                                                                                                                                              | 32         | Discord: usernames are 2 to 32 characters                               |
  | `{{member.displayName}}`          | the member's nickname on the server, otherwise their display name, otherwise their username. On departure Discord no longer gives the nickname, so it starts from the display name | 32         | Discord: nicknames are 1 to 32 characters; display name set by Welcomer |
  | `{{member.id}}`                   | the member's identifier                                                                                                                                                            | 20         | Discord identifiers have 20 digits at most                              |
  | `{{member.avatar}}`               | link to the member's avatar                                                                                                                                                        | 128        | set by Welcomer                                                         |
  | `{{server.name}}`                 | the server's name                                                                                                                                                                  | 100        | Discord: server names are 2 to 100 characters                           |
  | `{{server.id}}`                   | the server's identifier                                                                                                                                                            | 20         | Discord identifiers have 20 digits at most                              |
  | `{{server.memberCount}}`          | number of members                                                                                                                                                                  | 10         | set by Welcomer                                                         |
  | `{{server.memberCountFormatted}}` | number of members, thousands separated (1,234)                                                                                                                                     | 13         | set by Welcomer                                                         |
  | `{{channel.name}}`                | name of the channel where the message is posted                                                                                                                                    | 100        | Discord: channel names are 1 to 100 characters                          |
  | `{{channel.id}}`                  | identifier of the channel where the message is posted                                                                                                                              | 20         | Discord identifiers have 20 digits at most                              |

## Examples

```gherkin
Rule: R-MSG-8 Limits are checked in the worst case

  Example: A title that fits today but not in the worst case
    Given an embed title "Welcome {{member.username}}" followed by 220 other characters
    # As written: 8 + 19 + 220 = 247 characters, under the 256 of a title
    # Worst case: 8 + 32 + 220 = 260 characters, over the 256 of a title
    When the manager validates the configuration
    Then it is refused
    And the dashboard says the title could exceed 256 characters

  Example: The total of the embeds
    Given 2 embeds whose texts reach 5,990 characters with every variable at its maximum length
    When the manager adds a field value of 20 characters
    Then the configuration cannot be validated
    And the dashboard says the embeds could exceed 6,000 characters in total

Rule: R-MSG-9 Warning at 80%

  Example: Close to the limit
    Given a text of 1,650 characters in the worst case
    When the manager edits it
    Then the dashboard warns that the text reaches 80% of its limit
    And the configuration can still be validated

Rule: R-MSG-6 Empty message

  Example: Only a color
    Given a message with no text and one embed holding only a color
    And the configuration has no image
    When the manager validates it
    Then it is refused because the message is empty

  Example: Only an image
    Given a message with no text and no embed
    And the configuration uses an image
    When the manager validates it
    Then it is saved

Rule: R-VAR-2 Avatar in a link

  Example: Avatar alone
    Given the thumbnail link is "{{member.avatar}}"
    When the manager validates
    Then it is saved

  Example: Avatar mixed with text
    Given the thumbnail link is "https://example.com/{{member.avatar}}"
    When the manager validates
    Then it is refused because the link is not valid

Rule: R-VAR-4 Display name fallback

  Example: No nickname
    Given a member with no nickname on the server and the display name "Sam"
    When the bot replaces "{{member.displayName}}"
    Then it writes "Sam"
```
