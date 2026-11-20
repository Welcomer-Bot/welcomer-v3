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
- Default Discord scopes of the provider not verified: check at build.
