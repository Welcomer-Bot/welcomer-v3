# Glossary

Words used by every business document, with one meaning each.

| Term                  | Meaning                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Server                | A Discord server.                                                                                                                              |
| Member                | A Discord account that joins or leaves a server, bot accounts included.                                                                        |
| Bot                   | The Welcomer bot, as a member of a server.                                                                                                     |
| Bot present           | The bot is a member of the server.                                                                                                             |
| Dashboard             | The Welcomer website where signed-in users manage their servers.                                                                               |
| Dashboard home        | The list of the servers the signed-in user manages.                                                                                            |
| Back-office           | The part of the dashboard reserved for admins.                                                                                                 |
| Visitor               | Someone who is not signed in.                                                                                                                  |
| User                  | Someone signed in with their Discord account.                                                                                                  |
| Server manager        | A user who owns a server, or has the "Manage Server" or "Administrator" permission on it ([access](./access.md)).                              |
| Admin                 | A member of the Welcomer team, with the rights of a server manager on every server where the bot is present ([back-office](./back-office.md)). |
| Message type          | **Welcome**, posted when a member joins, or **goodbye**, posted when a member leaves.                                                          |
| Configuration         | What the bot posts for a message type: a name, a channel, a message and, optionally, an image ([configurations](./configurations.md)).         |
| Active configuration  | The one configuration of a message type that the bot uses. At most one per type.                                                               |
| Configuration library | The configurations of a server, up to 5 per message type.                                                                                      |
| Channel               | A text or announcement channel of a server, where the bot posts.                                                                               |
| Message               | The text, embeds and image the bot posts ([messages](./messages.md)).                                                                          |
| Embed                 | A framed block of a Discord message, with a title, a description, fields and pictures.                                                         |
| Variable              | A word between double braces, replaced when the message is posted, for example `{{member.mention}}` ([messages](./messages.md#variables)).     |
| Worst case            | A message where every variable is replaced by a text of its maximum length.                                                                    |
| Custom image          | A picture generated for each member, with their avatar and name ([images](./images.md)).                                                       |
| Image library         | The custom images of a server, up to 5.                                                                                                        |
| Layout                | The fixed arrangement of the avatar and texts in a custom image.                                                                               |
| Draft                 | Edits made on the dashboard and not yet validated. Members never see a draft ([editor](./editor.md)).                                          |
| Validate              | Save a draft so that the bot uses it.                                                                                                          |
| Discord connection    | One of the links the bot keeps open with Discord. Each one serves a share of the servers ([status page](./public-pages.md#status-page)).       |
| Event                 | A record of one arrival, departure or send, with its exact time ([statistics](./statistics.md)).                                               |
| Daily total           | The events of one day, counted together.                                                                                                       |
| Session               | The time a user stays signed in on one device ([access](./access.md)).                                                                         |
| Support server        | The Discord server where the Welcomer team answers users.                                                                                      |
