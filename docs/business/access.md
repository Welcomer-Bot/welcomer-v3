# Sign-in and server access

How a user signs in, how long they stay signed in, and which servers they may manage.

## Rules

### Sign-in

- **R-ACC-1** A user signs in only with their Discord account. Welcomer asks Discord only for the user's identity and the list of their servers, never for their email.
- **R-ACC-2** When the Discord authorization expires, it is renewed automatically when possible. Otherwise the user signs in with Discord again and comes back to the page they asked for.

### Session

- **R-ACC-3** A session lasts 7 days. It is extended while the user keeps using the dashboard.
- **R-ACC-4** Signing out ends the session at once: a copy of it no longer works. It ends only the session of the current device; the user stays signed in on their other devices.

### Server manager

- **R-ACC-5** A user is a server manager when they own the server, or have the "Manage Server" or "Administrator" permission there.
- **R-ACC-6** A user's rights come from their permissions at server level, roles included. Permissions set on a single channel do not count.
- **R-ACC-7** Rights are checked again on every page and every action that touches a server, at most 60 seconds late. A right removed on Discord stops counting within one minute.
- **R-ACC-8** A server's pages require the bot to be present on that server.
- **R-ACC-9** When a user has no access to a server, or loses it (rights removed, bot gone), they are sent back to the dashboard home. A draft in progress is lost.

### Server list

- **R-ACC-10** The dashboard home lists only the servers the user manages, those where the bot is present first, each group in alphabetical order. Each server shows its icon and its name. A server without the bot offers to invite it ([servers](./servers.md)).
- **R-ACC-11** When the user manages no server, a message says so instead of an empty list.
- **R-ACC-12** A person who is not signed in and opens a page that needs a sign-in goes to the Discord sign-in, then comes back to that page.

## Examples

```gherkin
Rule: R-ACC-6 Only server-level permissions count

  Example: Manage Server given on one channel only
    Given Alex has "Manage Server" on the channel "#welcome" only
    And Alex does not own the server and has no server-level permission
    When Alex opens the dashboard home
    Then the server is not in the list

Rule: R-ACC-9 Losing access sends the user home

  Example: Rights removed while editing
    Given Alex manages the server and is editing a configuration
    When the server owner removes Alex's "Manage Server" permission
    And Alex validates the configuration a minute later
    Then the configuration is not saved
    And Alex is sent back to the dashboard home
    And the draft is lost

  Example: The bot is kicked while editing
    Given Alex is editing a configuration of the server
    When the bot is kicked from the server
    And Alex opens another page of the server
    Then Alex is sent back to the dashboard home

Rule: R-ACC-4 Signing out ends only the current device

  Example: Two devices
    Given Alex is signed in on a laptop and on a phone
    When Alex signs out on the laptop
    Then the laptop session no longer works
    And Alex is still signed in on the phone
```
