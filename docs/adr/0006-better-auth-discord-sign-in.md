---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# Better Auth with Discord, default sessions, placeholder email

## Context and Problem Statement

Sign-in only with Discord, never asking for the email (R-ACC-1, R-PRV-2). The owner chose the authentication tool's default session settings.

## Considered Options

- Better Auth, Discord provider, scopes identify and guilds, placeholder email
- Auth.js
- Hand-made OAuth

## Decision Outcome

Chosen option: "Better Auth, Discord provider, scopes identify and guilds, placeholder email". Better Auth with the Discord provider. Default scopes are replaced by `identify` and `guilds`. Better Auth requires an email on every user, so `mapProfileToUser` stores the documented placeholder `<discord id>@discord.placeholder.invalid`, never used as a contact. Sessions keep the defaults: 7 days, extended by use.

### Consequences

- Good: maintained library; no email collected.
- Bad: the 7-day session is longer than OWASP's idle timeout of 15 to 30 minutes for low-risk applications: an accepted deviation.

## More Information

- [Better Auth, session management](https://www.better-auth.com/docs/concepts/session-management): "The session expires after 7 days by default."
- [Better Auth, OAuth](https://www.better-auth.com/docs/concepts/oauth): "Better Auth currently requires an email address on every user record"; placeholder via `mapProfileToUser`.
- [OWASP, session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- The provider's default scopes are `identify` and `email`, and `scope` adds to them (`@better-auth/core`, `social-providers/discord.mjs`); `disableDefaultScope` replaces them with `identify` and `guilds` (slice 2, D1).
- Sessions are refreshed by the browser only: server components cannot set cookies, so they read the session without refreshing it, and the header's client call refreshes the database and the cookie together ([Better Auth, Next.js integration](https://www.better-auth.com/docs/integrations/next)) (slice 2, D4).
- The Better Auth CLI is the `auth` package: `@better-auth/cli` is deprecated on npm ("Package no longer supported"), and the docs use `npx auth@latest generate` ([Better Auth, CLI](https://www.better-auth.com/docs/concepts/cli)). Slice 0 ran `auth generate` to write the user, session, account and verification models into the Prisma schema.
- `next build` needs no secret: with no environment the build succeeds; Better Auth only logs that the default secret is in use while Next.js collects page data. Its source says the secret "should be at least 32 characters long" (a warning), which the dashboard's environment check enforces.
