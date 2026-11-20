# Welcomer — business requirements

What the product must do, and for whom. No technical solution here. The rules live in one document per domain, listed below; words have the meaning given in the [glossary](./business/glossary.md).

## Purpose

Welcomer helps the managers of a Discord server greet the members who join and say goodbye to those who leave.

- A manager composes a custom message for arrivals and for departures, with text, embeds and a custom image.
- A manager configures the message on the dashboard, previews it, then validates it.
- A manager follows the evolution of the server's members (arrivals, departures) and what the bot sent (messages, embeds, images).
- For everything the bot does, Welcomer follows what the large Discord bots do.

## Actors

| Actor          | Who                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor        | Not signed in. Reads the [public pages](./business/public-pages.md).                                                                                             |
| User           | Signed in with a Discord account. Sees the servers they manage, those where the bot is present first. Invites the bot to a server where it is absent. Signs out. |
| Server manager | Owns the server, **or** has the Discord "Manage Server" permission there, **or** has "Administrator".                                                            |
| Admin          | Member of the Welcomer team. Uses the back-office to find any server where the bot is present, then manages it like a server manager.                           |

## Domains

Each rule has an identifier (for example R-MSG-8) and, when it has edge cases, examples written as Given / When / Then.

| Domain                                              | Prefix       | Covers                                                                 |
| --------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| [Sign-in and server access](./business/access.md)   | R-ACC        | sign-in, session, who manages a server, server list                    |
| [Bot on a server](./business/servers.md)            | R-SRV        | invitation, permissions, member count, bot leaving and coming back     |
| [Configurations](./business/configurations.md)      | R-CFG        | sending, library, activation, deletion, channel gone                   |
| [Messages](./business/messages.md)                  | R-MSG, R-VAR | embeds, empty message, Discord limits, default message, variables      |
| [Editor](./business/editor.md)                      | R-EDT        | preview, warnings, draft, validation, two people at once               |
| [Custom images](./business/images.md)               | R-IMG        | library, layouts, avatar, texts, background, place in the message      |
| [Bot commands](./business/commands.md)              | R-CMD        | `/help`, `/status`, `/test`                                            |
| [Statistics](./business/statistics.md)              | R-STA        | events, daily totals, what is counted, days, statistics page           |
| [Public pages](./business/public-pages.md)          | R-PUB        | landing, status page                                                   |
| [Back-office](./business/back-office.md)            | R-ADM        | admin access, server list and search, managing a server                |
| [Privacy and personal data](./business/privacy.md)  | R-PRV        | personal data kept, retention, legal basis, rights of users            |

## Cross-domain views

| Document                                        | Covers                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| [User journeys](./business/journeys.md)         | user stories of each actor, linked to the rules                           |
| [Screen map](./business/screens.md)             | the screens, what each shows, how people move between them                |
| [Domain model](./business/domain-model.md)      | the business objects and how they relate                                  |
| [Business processes](./business/processes.md)   | member arrival or departure, bot arrival and departure, edit and validate |

## Data the product keeps

| Data                                 | Produced by                                | Used by                        |
| ------------------------------------ | ------------------------------------------ | ------------------------------ |
| Servers where the bot is present     | the bot                                    | the dashboard, the back-office |
| Configuration library of each server | a manager or an admin, on the dashboard    | the bot                        |
| Image library of each server         | a manager or an admin, on the dashboard    | the bot                        |
| Statistics: events and daily totals  | the bot                                    | the dashboard                  |
| Users who signed in                  | the dashboard                              | the dashboard                  |
| Sign-in sessions of users            | the dashboard                              | the dashboard                  |
| Technical logs                       | the bot, the dashboard                     | the Welcomer team              |
| List of admins                       | the Welcomer team                          | the back-office                |

## Non-functional needs

- Scale: 100,000 servers.
- Availability: the bot is never interrupted for more than a few seconds, updates included. The dashboard may be interrupted for a few seconds during an update; an interruption of a few minutes is not acceptable.
- Delivery: the dashboard, the bot and the Discord connections are updated separately, each one only after passing the quality checks.
- Monitoring: anyone can know at any time whether the bot works, on the public [status page](./business/public-pages.md#status-page).
- Budget: the product runs on one server with 8 GB of memory. The database is hosted separately.
- Language: the dashboard and the bot are in English only.
- Formats: dates and numbers follow the visitor's browser settings. The status page shows times in the visitor's local time; statistics use UTC days (R-STA-10).
- Devices: every page works on a phone and on a computer.
- Look: the default theme of the interface library, without a custom design.
- Accessibility: what the interface library and the framework's checks give by default; no further audit. Most users are server managers on a computer, not a public that needs more.

## Later

- Buttons and menus in messages, including ones the bot reacts to.
- Preselect a channel when the bot joins a server, so a first configuration can exist from the start.
- A user deletes their own personal data from the dashboard, without asking.
- Automatic deletion of the message after a delay.
- Premium.
- Back-office search for a user, to see the servers they manage.
- History of the bot's incidents on the status page.
- Legal pages: terms of service and privacy policy, with what they must state (who runs Welcomer, law, authority, hosting, cookies).
- Deploying to the server: one automatic deploy per unit (dashboard, bot, gateway), first server setup, roll back.
- Monitoring: an uptime monitor with alerts to the owner, and service level objectives measured by it.
