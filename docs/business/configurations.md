# Configurations

What the bot posts when a member joins or leaves, and how a server keeps its configurations.

## Rules

### Sending

- **R-CFG-1** There are two message types: **welcome** when a member joins, **goodbye** when a member leaves.
- **R-CFG-2** At most one configuration is active per message type. On each arrival or departure, the bot posts the active configuration of that type in its channel. With none active, the bot sends nothing for that type.
- **R-CFG-3** If the message cannot be posted (channel gone, missing permission), nothing happens: no retry, no notice.
- **R-CFG-4** Every member counts, bot accounts included: no member is filtered out.

### Library

- **R-CFG-5** A configuration holds a name, a channel, a message ([messages](./messages.md)) and, optionally, an image from the image library with its place in the message ([images](./images.md#place-in-the-message)).
- **R-CFG-6** Each configuration belongs to one message type. A server keeps up to 5 configurations per type, active or not. At 5, creation is blocked and the dashboard says to delete a configuration first.
- **R-CFG-7** The name is required, 50 characters at most, and unique among the configurations of the same type. Spaces at the start and end are removed; case counts.
- **R-CFG-8** The channel is a text or announcement channel of the server.
- **R-CFG-9** A configuration is saved only when it is validated ([editor](./editor.md)). A validated configuration is always complete: a name, a channel and a message that is not [empty](./messages.md#empty-message). The image is optional.
- **R-CFG-10** A new configuration starts with the [default message](./messages.md#default-message) of its type.
- **R-CFG-11** The library lists the configurations in their creation order and highlights the active one of each type.

### Activation

- **R-CFG-12** A manager activates or deactivates a configuration from the library, at once, without a draft. Only validated configurations exist, so only a validated one can be active.
- **R-CFG-13** Activating a configuration while another of the same type is active deactivates the other one. The dashboard says which one.

### Deletion

- **R-CFG-14** A manager can delete any configuration, the active one included, after confirming.
- **R-CFG-15** Before deleting the active one, the dashboard warns that nothing will be sent for that type any more.

### Channel gone

- **R-CFG-16** If the channel of a configuration is deleted on Discord, the configuration stays as it is, active or not. Its sends fail as in R-CFG-3.
- **R-CFG-17** The dashboard shows that channel as not found and asks the manager to choose another one.

## Examples

```gherkin
Rule: R-CFG-13 One active configuration per type

  Example: Activating a second welcome configuration
    Given the welcome configuration "Summer" is active
    When the manager activates the welcome configuration "Winter"
    Then "Winter" is active
    And "Summer" is no longer active
    And the dashboard says that "Summer" was deactivated

  Example: Types do not interfere
    Given the welcome configuration "Summer" is active
    When the manager activates the goodbye configuration "Bye"
    Then "Summer" and "Bye" are both active

Rule: R-CFG-6 Five configurations per type

  Example: Limit reached
    Given the server has 5 welcome configurations, one of them active
    When the manager tries to create a welcome configuration
    Then creation is blocked
    And the dashboard says to delete a configuration first

  Example: The other type is not affected
    Given the server has 5 welcome configurations and 0 goodbye configurations
    When the manager creates a goodbye configuration
    Then it is created

Rule: R-CFG-7 Name unique within a type

  Example: Same name, other type
    Given a welcome configuration named "Default"
    When the manager validates a goodbye configuration named "Default"
    Then it is saved

  Example: Same name, same type
    Given a welcome configuration named "Default"
    When the manager validates another welcome configuration named "Default"
    Then it is refused because the name is taken

Rule: R-CFG-15 Deleting the active configuration

  Example: Nothing sent afterwards
    Given the welcome configuration "Summer" is the active one
    When the manager deletes "Summer" and confirms
    Then no welcome configuration is active
    And the next member who joins gets no message

Rule: R-CFG-16 Channel deleted on Discord

  Example: Active configuration with a deleted channel
    Given the active welcome configuration posts in "#welcome"
    When "#welcome" is deleted on Discord
    And a member joins
    Then nothing is posted and nothing is retried
    And the configuration is still active
    And the dashboard shows its channel as not found
```
