# Slice 2 — Sign-in and servers: implementation plan

**Goal.** A person signs in with Discord, stays signed in for 7 days while they use the dashboard, and signs out of one device only. The dashboard home lists the servers they manage, those with the bot first, and offers to invite the bot where it is absent. A server where the bot is present opens on a shell with the server's icon, name, a link home and three tabs. Rights are checked again on every page, at most 60 seconds late. Accounts disappear with their last session. The quality gate proves all of it without Discord credentials.

**Scope** ([roadmap](../roadmap.md), slice 2). Covered here: R-ACC-1 to R-ACC-12, R-SRV-1, R-PRV-1 to R-PRV-3, and the page header of [screens](../business/screens.md) (deferred from slice 1). Out of scope: the content of the three tabs (slices 3 to 5), Server Actions and drafts (slice 3; R-ACC-7 "every action" and the R-ACC-9 lost draft apply there), admins and the back-office link (slice 6, R-ADM-1, R-ADM-5), the landing page invitation (slice 6, R-PUB-1), the Content Security Policy and nginx headers (deploying, [requirements, later](../requirements.md#later)).

**Architecture summary.** Everything runs in `apps/dashboard`, except the session cleanup job, which runs in the bot process ([data model, scheduled jobs](../technical/data-model.md#scheduled-jobs)).

- `packages/domain` gains the pure rules: who manages a server (R-ACC-5, R-ACC-6), the order of the server list (R-ACC-10), the invitation link (R-SRV-1, R-SRV-2) and the errors `NoAccess` and `SignInRequired`. The bot reuses the manager rule for `/test` in slice 3 (R-CMD-3), which is why it lives in the shared package ([architecture 5.2](../technical/architecture.md#52-repository-layout)).
- `apps/dashboard/src/lib/auth.ts` keeps the Better Auth instance of slice 0, with the Discord scopes and the placeholder email. `src/lib/auth-client.ts` is the React client.
- `src/server/auth/session.ts` is the Data Access Layer of the Next.js guide: it reads the session and redirects to the sign-in page.
- `src/server/access/` holds the access service and its two ports: the user's Discord servers (adapter: Better Auth access token, then `GET /users/@me/guilds`, cached 60 seconds per user), and the servers where the bot is present (adapter: Prisma, `server` table).
- Routes: `/sign-in`, `/dashboard`, `/servers/[serverId]` (redirect), and `/servers/[serverId]/{configurations,images,statistics}` under one shared shell, in no layout. A header in the root layout.
- `apps/bot/src/bot/jobs/`: an hourly scheduler and the `sessions` job (R-PRV-3).

Layers follow [development, architecture rules](../technical/development.md#architecture-rules): pages are handlers (session, one service call, errors mapped to redirects), the service throws domain errors, adapters map Discord and Prisma shapes to domain types.

**Method.** Each task follows the [test strategy](../technical/test-strategy.md). Domain rules and the service get Vitest tests first. Pages are async Server Components, so their rules get Playwright tests first, with a stubbed sign-in and a Discord mock (Next.js, Vitest guide, `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`: "we recommend using **E2E tests** for `async` components"). Run each test, see it FAIL, write the code, see it PASS. Configuration and test infrastructure are TDD exceptions; their check is the command they ship. Each task ends with one commit: Conventional Commits, no `Co-Authored-By` trailer. Branch: `feat/slice-2-sign-in`.

## Tech stack (npm registry, 2026-11-21)

Everything from [slice 0](./0-foundation.md#tech-stack-npm-registry-2026-11-20) and [slice 1](./1-bot-online.md#tech-stack-npm-registry-2026-11-20) is unchanged. Added in this slice:

| Package     | Version | Note                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@next/env` | 16.4.6  | Dev dependency of the dashboard, the same version as `next`. Loads `.env` into the Playwright test process. Next.js: "If you need to load environment variables outside of the Next.js runtime, such as in a root config file for an ORM or test runner, you can use the `@next/env` package" (`node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`) (D15) |

HeroUI components used, as shipped in `@heroui/react` 3.2.7: `Avatar`, `Button`, `Link`, `Tabs`. No new package for them.

## Decisions and [verify at build] items resolved now

Sources marked "source" were read in the installed packages of the main checkout (`better-auth` 1.7.26, `@better-auth/core` 1.7.26, `next` 16.4.6, `@heroui/react` 3.2.7). The worktree has no `node_modules`; Task 1 installs them and the bundled docs are re-read where a task says so.

- **D1. Discord scopes: `identify` and `guilds`, nothing else (R-ACC-1, R-PRV-2).** The provider's defaults are `["identify", "email"]`, and `scope` adds to them: `const _scopes = options.disableDefaultScope ? [] : ["identify", "email"]; … if (options.scope) _scopes.push(...options.scope)` (source, `@better-auth/core/dist/social-providers/discord.mjs`). So the provider gets `disableDefaultScope: true, scope: ["identify", "guilds"]`. Discord: `identify` "allows /users/@me without email", `guilds` "allows /users/@me/guilds to return basic information about all of a user's guilds" ([Discord, OAuth2 scopes](https://docs.discord.com/developers/topics/oauth2#shared-resources-oauth2-scopes)). This resolves the [verify at build] of contracts.md ("Dashboard to Discord: user calls") and ADR-0006 ("Default Discord scopes of the provider not verified"). Task 10 writes it back.
- **D2. Placeholder email, nothing else changed in the user record (R-PRV-1, R-PRV-2).** Better Auth "currently requires an email address on every user record" ([Better Auth, OAuth](https://www.better-auth.com/docs/concepts/oauth)), and without the `email` scope the profile has none. `mapProfileToUser` returns `{ email: "<discord id>@discord.placeholder.invalid" }`, as ADR-0006 and data-model.md say. The provider already maps `name: profile.global_name || profile.username` and `image` to the avatar link (source, same file). The Discord identifier is `account.accountId` (`accountSubject: ({ profile }) => profile.id`). The username is not kept on its own: R-PRV-1 lists what Welcomer may keep at most, and showing who is signed in needs only the display name and avatar. The mapping is one exported function with one test.
- **D3. Sessions keep Better Auth's defaults (R-ACC-3, R-ACC-4).** The defaults are `expiresIn: 604800` and `updateAge: 86400` (source, `context/create-context.mjs`), "The session expires after 7 days by default" ([Better Auth, session management](https://www.better-auth.com/docs/concepts/session-management)). The cookie cache is off unless `session.cookieCache.enabled` is true (source, `cookies/index.mjs`), so every read checks the `session` row, and sign-out deletes that row only: `deleteSession(sessionCookieToken)` (source, `api/routes/sign-out.mjs`). A copy of the cookie then fails, and the other devices keep their rows (R-ACC-4). No setting changes.
- **D4. Server reads of the session never refresh it; the browser does.** Better Auth: "As RSCs cannot set cookies, the cookie cache will not be refreshed until the server is interacted with from the client via Server Actions or Route Handlers" ([Better Auth, Next.js integration](https://www.better-auth.com/docs/integrations/next)). If a Server Component refreshed the session, the database would get the new expiry and the browser cookie (`maxAge` 7 days, source `cookies/index.mjs`) would not, so a user active every day could still be signed out on day 7. Root fix: the Data Access Layer calls `auth.api.getSession({ headers, query: { disableRefresh: true } })` (the `disableRefresh` query is read in `api/routes/session.mjs`), and the header's client component calls `authClient.useSession()`, which goes through the `/api/auth/get-session` route handler, where the refresh writes the database and the cookie together. The `nextCookies` plugin is not added: it only skips the refresh on client navigations (`isRSC && !isServerAction`, source `integrations/next-js.mjs`), and this slice calls Better Auth from no Server Action. **[verify at build: the session cookie's `Max-Age` is renewed after `updateAge`, owner live check Task 12, step 7.]**
- **D5. Authorization in each page, through a Data Access Layer; no Proxy.** Next.js: "The majority of security checks should be performed as close as possible to your data source", and "be cautious when doing checks in Layouts as these don't re-render on navigation" (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`). Better Auth calls the Proxy cookie check "NOT SECURE!" and advises "handling auth checks in each page/route" (Next.js integration page). So each page, and the server layout, call the DAL. A Proxy would only add a second, optimistic check (KISS: none). With `cacheComponents` on, a session read "always sits behind a `<Suspense>` boundary" and must stay out of a layout's top level (`node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md`). `redirect()` inside a streamed boundary works: "When used in a streaming context, this will insert a meta tag to emit the redirect on the client side" (`03-api-reference/04-functions/redirect.md`).
- **D6. Sign-in page with one button (R-ACC-12).** Starting the Discord flow is a POST that creates a state record, so it follows a user action. A page needing a session redirects to `/sign-in?callbackURL=<path>`. That page shows one button, "Sign in with Discord", which calls `authClient.signIn.social({ provider: "discord", callbackURL })` ([Better Auth, basic usage](https://www.better-auth.com/docs/basic-usage)); without `callbackURL` it uses `/dashboard`. Better Auth checks the callback against its trusted origins: "A middleware to validate callbackURL and origin against trustedOrigins" (source, `api/middlewares/origin-check.mjs`), so no open redirect. The page is the "Discord sign-in" node of the [screen map](../business/screens.md); the business rule needs no change. The provider keeps its `prompt: "none"` default, so a returning user skips Discord's consent screen: "it will skip the authorization screen and redirect them back" (Discord, OAuth2).
- **D7. One guild call, no pagination.** contracts.md says to ask again with `after` when 200 servers come back. Discord: "This endpoint returns 200 guilds by default, which is the maximum number of guilds a non-bot user can join" ([Discord, Get Current User Guilds](https://docs.discord.com/developers/resources/user#get-current-user-guilds)). So one call answers for every user; the `after` loop is dropped (least code). Task 10 updates contracts.md.
- **D8. Rights cached 60 seconds per user with `use cache` (R-ACC-7).** The Next.js guide for this case: "Passing the user id into a plain `use cache` function keeps the result on the server, keyed by the id", and "keep secrets and sensitive personal data (tokens, passwords, raw emails) out of arguments" (`authentication-with-cache-components.md`, Step 4). So the adapter's cached function takes the user id only, and reads the access token inside. Its lifetime is `cacheLife({ stale: 30, revalidate: 59, expire: 60 })`: `expire` is the "Maximum time before the server must regenerate cached content", `revalidate` must be lower ("`expire` must be longer than `revalidate`"), and the client `stale` has a "Minimum of 30 seconds" (`03-api-reference/04-functions/cacheLife.md`). The default cache is in memory, which matches the single dashboard instance of contracts.md. Bot presence is read from the database on every check, uncached. Checked at build: see Build results.
- **D9. Manager rule (R-ACC-5, R-ACC-6).** `/users/@me/guilds` returns, per guild, `owner` ("true if the user is the owner of the guild") and `permissions`, the "total permissions for the user in the guild (excludes overwrites and implicit permissions)" ([Discord, guild object](https://docs.discord.com/developers/resources/guild#guild-object-guild-structure)). Excluding overwrites is exactly R-ACC-6, so R-ACC-6 is covered by this field choice and needs no test of its own (its input would be the same as R-ACC-5's). A user manages a guild when `owner` is true or `permissions` has `ADMINISTRATOR` (`1 << 3`) or `MANAGE_GUILD` (`1 << 5`) ([Discord, permissions](https://docs.discord.com/developers/topics/permissions#permissions-bitwise-permission-flags), not re-fetched for this plan). `permissions` is a string, so the check uses `BigInt(...)`, not BigInt literals (the dashboard's `ES2017` target, slice 1 build results).
- **D10. Token renewal and its failure (R-ACC-2).** `auth.api.getAccessToken` refreshes "when it is within five seconds of expiry" and stores the new tokens (source, `api/routes/account.mjs`, `getValidAccessToken`). Discord tokens last `expires_in` seconds, 604800 in its example, and are renewed with `grant_type` `refresh_token` (Discord, OAuth2). Its body is `accountSelectionSchema`, a union of `strictObject({ accountId, userId? })` and `strictObject({ useAccountCookie: true, userId? })` (source, `api/routes/account.mjs`), where `accountId` is the Better Auth account row id; `providerId` is refused by `strictObject`. So the cached function first reads the Discord account with `prisma.account.findFirst({ where: { userId, providerId: "discord" }, select: { id: true } })`, then calls `getAccessToken({ body: { accountId, userId } })`. No row, a failed refresh, or a Discord 401 throws `SignInRequired`, and the page redirects to `/sign-in?callbackURL=<its own path>`. Signing in again replaces the stored tokens: `updateAccountOnSignIn !== false` (source, `oauth2/link-account.mjs`). Each page passes its own path, because a Server Component does not know the URL it renders. Accepted risk: `getValidAccessToken` turns any refresh failure, a network error included, into `FAILED_TO_GET_ACCESS_TOKEN` (source, same file), so a Discord outage during a refresh sends the user to sign-in.
- **D11. Invitation link (R-SRV-1, R-SRV-2).** `inviteUrl(clientId, serverId?)` in `packages/domain` builds the link of [contracts, invitation link](../technical/contracts.md#invitation-link): `scope=bot applications.commands`, `permissions=52224`, and, from the dashboard, `guild_id` with `disable_guild_select=true`. Discord: `guild_id` "pre-fills the dropdown picker with a guild", `disable_guild_select` "disallows the user from changing the guild dropdown" (Discord, OAuth2). The dashboard opens it with `target="_blank"` and `rel="noopener noreferrer"`. The landing page (slice 6) calls it without a server.
- **D12. Server pages shell.** `/servers/[serverId]` redirects with `next.config.ts` `redirects()`, `permanent: false` ("307 status code which is temporary and is not cached", `03-api-reference/05-config/01-next-config-js/redirects.md`): no page code. `src/app/servers/[serverId]/layout.tsx` shows icon, name, a link to `/dashboard` and the tabs; it checks access too, because it shows the server name, and each page checks again (D5). Tabs are HeroUI `Tabs` with `href` and `render` set to `next/link`, as the HeroUI Tabs example does; React Aria: "Use the `href` prop on a `<Tab>` to create a link" ([React Aria, Tabs](https://react-aria.adobe.com/Tabs)). The selected tab is the last segment of `usePathname()` (`03-api-reference/04-functions/use-pathname.md`), in a small client component. Neither HeroUI nor React Aria documents a route-driven `selectedKey`: this is the plain controlled prop.
- **D13. Header (screens).** Root layout: "Welcomer" linking to `/`, "Status", "Support", then "Sign in" or the user's avatar and name with "Sign out". The support link reads `SUPPORT_SERVER_URL` at request time, inside `<Suspense>` after `await connection()`: "You can safely read environment variables on the server during dynamic rendering" (`02-guides/environment-variables.md`); the static shell is built without environment variables (slice 1, D11). The user part is a client component on `authClient.useSession()` (D4); sign-out calls `authClient.signOut()` then goes to `/`. The back-office link waits for slice 6.
- **D14. Session cleanup job in the bot, every hour (R-PRV-3).** data-model.md puts the `sessions` job in the bot process, because Better Auth deletes an expired session only when it is read (source, `api/routes/session.mjs`, "if session expired clean up the session"). The job deletes expired sessions, then users without a session; `account` and `session` cascade from `user` (schema). It runs at start, then every hour with `setInterval`, so an account goes within an hour of its last session's end and R-PRV-1 and R-PRV-3 keep their wording. The daily 00:05 UTC schedule of data-model.md would keep an account up to a day longer; Task 10 changes data-model.md to "every hour", and slice 5's `partitions` job, which is idempotent, can share the same schedule. A failure is logged at level error. A user is deleted only when created more than one minute before the run (`createdAt: { lt: now - 1 minute }`), so a sign-in that runs between Better Auth's user and session inserts is never lost: the same guard as `recorded_at` in slice 1 (D6). Contradiction found: contracts.md says `user` and `session` are written by "dashboard (Better Auth)" only; Task 10 adds the bot's deletes.
- **D15. End-to-end sign-in stub and Discord mock.** Better Auth ships a test plugin "for writing integration and E2E tests", whose `getCookies` returns cookies "compatible with browser testing tools like Playwright", with the advice to "Prefer keeping it out of production auth configs" ([Better Auth, Test Utils](https://www.better-auth.com/docs/plugins/test-utils)). So `e2e/auth.mts` builds a test-only `betterAuth({ database, secret, plugins: [testUtils()] })` on the same database and secret, saves a user, adds its Discord `account` row with Prisma (the plugin has no account helper), and passes `getCookies({ userId, domain: "localhost" })` to `context.addCookies`. This resolves the [verify at build] of development.md ("Better Auth test helpers"). The Discord mock is `e2e/discord-mock.mts`, a Node `http` server on port 3001 that answers `GET /users/@me/guilds` by bearer token; Playwright starts it as a second `webServer` and gives the dashboard `DISCORD_API_URL=http://localhost:3001` in that `webServer`'s `env`, as [development, tests locally](../technical/development.md#tests-locally) plans. The Playwright config loads `.env` with `loadEnvConfig` from `@next/env`, which does not override variables already set, so the local `DATABASE_URL` of `welcomer_test` still wins (checked at build, see Build results). Accounts get an access token expiry one year ahead, because the refresh endpoint is Discord's own and is never called in a test.
- **D16. OAuth tokens stored as Better Auth stores them.** `account.encryptOAuthTokens` is off unless set (source, `oauth2/utils.mjs`). Framework default stays (CLAUDE.md, "A framework default stays the default"). The tokens read only identity and server list (D1). Listed in open risks for the owner.
- **D17. Server icons.** List and shell show `https://cdn.discordapp.com/icons/<server id>/<icon hash>.png` ([Discord, image formatting](https://docs.discord.com/developers/reference#image-formatting), not re-fetched; static, like the avatars of contracts.md), and HeroUI `Avatar` with the name's first letter when the server has no icon. Plain `<img>` through `Avatar`, so `next/image` needs no `remotePatterns`.
- **D18. Texts not set by the business docs.** R-ACC-11: "You do not manage any server yet." Invitation button: "Invite the bot". Sign-in page: heading "Sign in", button "Sign in with Discord". Tab names come from [screens](../business/screens.md): Configurations, Images, Statistics. Tab pages show only their heading until their slice.

## File map

| Path                                                                                                                                   | Responsibility                                                                 | Origin                   |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| `packages/domain/src/{access,invitation,errors,index}.ts`, `access.test.ts`, `invitation.test.ts`                                      | manager rule, server list order, invitation link, `NoAccess`, `SignInRequired` | hand, test first         |
| `apps/dashboard/src/lib/auth.ts`, `auth.test.ts`                                                                                       | scopes (D1), placeholder email (D2)                                            | edited, test first       |
| `apps/dashboard/src/lib/auth-client.ts`                                                                                                | `createAuthClient` from `better-auth/react`                                    | Better Auth docs         |
| `apps/dashboard/src/server/auth/session.ts`                                                                                            | DAL: `currentUser(path)` (D4, D5)                                              | Next.js DAL pattern      |
| `apps/dashboard/src/server/access/{access-service,access-service.test,discord-guilds,server-repository,index}.ts`                      | R-ACC-5 to R-ACC-10 behind two ports                                           | hand, test first         |
| `apps/dashboard/src/app/layout.tsx`, `src/app/header.tsx`, `src/app/user-menu.tsx`                                                     | header (D13)                                                                   | edited, hand             |
| `apps/dashboard/src/app/sign-in/{page,sign-in-button}.tsx`                                                                             | R-ACC-12 (D6)                                                                  | hand, e2e first          |
| `apps/dashboard/src/app/dashboard/page.tsx`                                                                                            | R-ACC-10, R-ACC-11, R-SRV-1                                                    | hand, e2e first          |
| `apps/dashboard/src/app/servers/[serverId]/{server-shell,server-tabs}.tsx`, `access.ts`, `{configurations,images,statistics}/page.tsx` | shell and tabs, R-ACC-7 to R-ACC-9                                             | hand, e2e first          |
| `apps/dashboard/next.config.ts`                                                                                                        | `/servers/[serverId]` redirect (D12)                                           | edited                   |
| `apps/dashboard/{playwright.config.ts,package.json}`, `e2e/{auth,discord-mock}.mts`                                                    | stubbed sign-in, Discord mock, `@next/env` (D15)                               | edited, Better Auth docs |
| `apps/dashboard/e2e/{sign-in,dashboard,servers}.spec.mts`                                                                              | journeys                                                                       | hand                     |
| `apps/bot/src/bot/jobs/{schedule,session-service,session-repository,session-service.test}.ts`, `index.ts`                              | hourly scheduler and `sessions` job (D14)                                      | hand, test first         |
| `apps/bot/src/test/database.ts`                                                                                                        | fixtures `aUserWithSessions()`, `resetUsers()`                                 | edited                   |
| `docs/technical/{contracts,data-model,development,architecture}.md`, `docs/adr/0006…`                                                  | write-back (Task 10)                                                           | edited                   |

## Tasks

After each task, `git status` must show nothing unexpected. Never commit a `.env`, and never print `apps/dashboard/.env`: it holds the owner's Discord credentials. Every check runs from the repository root. Database checks need `docker compose -f compose.dev.yaml up -d --wait` and run on `welcomer_test` ([development, tests locally](../technical/development.md#tests-locally)).

### Task 1 — Install and read the bundled docs

TDD exception: no code.

1. `yarn install --immutable`, then `yarn turbo run db:generate`.
2. Re-read, in this worktree, the bundled pages cited by D4, D5, D8, D12 and D13 under `apps/dashboard/node_modules/next/dist/docs/` (or the hoisted `node_modules/next/dist/docs/`), and the `better-auth` sources cited by D1 to D4, D10 (`accountSelectionSchema` and `getValidAccessToken` in `api/routes/account.mjs`) and D14. If one differs from this plan, stop and record the difference here before coding.
3. Check: `yarn lint`, `yarn typecheck` and `yarn test` exit 0 on the untouched branch. No commit.

### Task 2 — Access and invitation rules (test first)

Files: `packages/domain/src/{access,invitation,errors,index}.ts`, `access.test.ts`, `invitation.test.ts`.

1. Write the tests first, with a shared builder `aGuild(overrides)` (`id`, `name`, `icon`, `owner: false`, `permissions: "0"`).

   `access.test.ts`:
   - `R-ACC-5: the owner manages the server` (owner true, permissions `"0"`)
   - `R-ACC-5: Manage Server or Administrator makes a manager` (`"32"`, `"8"`, and `"40"` both)
   - `R-ACC-5: any other permission does not` (`"2048"` send messages)
   - `R-ACC-10: servers with the bot first, each group in alphabetical order` (present "Zeta", "alpha"; absent "Beta", "Alpha"; expected alpha, Zeta, Alpha, Beta)

   `invitation.test.ts`:
   - `R-SRV-2: asks only for view channels, send messages, embed links and attach files` (`permissions=52224`, `scope=bot applications.commands`)
   - `R-SRV-1: from the dashboard, preselects the chosen server` (`guild_id` and `disable_guild_select=true`); without a server, neither is set

   Run `yarn test --filter=@repo/domain`. Expected: FAIL.

2. Write the code:
   - `access.ts`: `UserGuild` (`id`, `name`, `icon`, `owner`, `permissions: string`), `isManager(guild)` (D9), `ManagedServer` (`id`, `name`, `icon`, `botPresent`), and `serverList(guilds, presentIds: Set<string>)` that keeps managers, marks presence and sorts with `localeCompare(…, "en")`.
   - `invitation.ts`: `inviteUrl(clientId, serverId?)` with `URLSearchParams` (D11).
   - `errors.ts`: `NoAccess` and `SignInRequired`, like the existing errors.
3. Run the tests again. Expected: PASS. `yarn lint` and `yarn typecheck` exit 0.
4. Commit: `feat(domain): add server manager, server list and invitation rules`.

### Task 3 — Better Auth: scopes, placeholder email, client and session access (test first)

Files: `apps/dashboard/src/lib/{auth,auth.test,auth-client}.ts`, `src/server/auth/session.ts`.

1. Write `src/lib/auth.test.ts` first: `R-PRV-2: a Discord profile is stored with a placeholder email, never its own` (`discordUser({ id: "81384788765712384", email: "alex@example.com" })` gives `{ email: "81384788765712384@discord.placeholder.invalid" }`). Run `yarn test --filter=dashboard -- src/lib/auth.test.ts`. Expected: FAIL.
2. In `auth.ts`, export `discordUser = (profile: DiscordProfile) => ({ email: \`${profile.id}@discord.placeholder.invalid\` })`and set on the provider:`disableDefaultScope: true`, `scope: ["identify", "guilds"]`, `mapProfileToUser: discordUser` (D1, D2). Nothing else changes: sessions keep their defaults (D3). Expected: PASS.
3. `auth-client.ts`: `export const authClient = createAuthClient()` from `better-auth/react` (the Next.js integration page: "make sure to import from better-auth/react"); same origin, so no `baseURL`.
4. `src/server/auth/session.ts`, with `import "server-only"` as the Next.js guide does:

   ```ts
   export const currentUser = cache(async (path: string) => {
     const session = await auth.api.getSession({
       headers: await headers(),
       query: { disableRefresh: true },
     });
     if (!session) redirect(signInPath(path));
     return {
       id: session.user.id,
       name: session.user.name,
       image: session.user.image,
     };
   });
   export const signInPath = (path: string) =>
     `/sign-in?callbackURL=${encodeURIComponent(path)}`;
   ```

   React `cache` memoizes it per render, as the Next.js DAL does (`authentication.md`, "Creating a Data Access Layer").

5. Check: `yarn lint`, `yarn typecheck`, `yarn test` exit 0.
6. Commit: `feat(dashboard): ask discord for identity and servers only`.

### Task 4 — Access service and its adapters (test first)

Files: `apps/dashboard/src/server/access/*`.

1. Ports, in `access-service.ts`:

   ```ts
   export interface UserGuilds {
     list(userId: string): Promise<UserGuild[]>; // throws SignInRequired
   }
   export interface PresentServers {
     presentIds(ids: string[]): Promise<Set<string>>;
   }
   ```

2. Write `access-service.test.ts` first, with in-memory ports and the builder of Task 2:
   - `R-ACC-8: a server without the bot cannot be opened` (manager, absent: `requireServer` throws `NoAccess`)
   - `R-ACC-9: a server the user does not manage cannot be opened` (present, permissions `"0"`: throws `NoAccess`; unknown id: throws `NoAccess`)

   Run `yarn test --filter=dashboard -- src/server/access/access-service.test.ts`. Expected: FAIL.

3. `createAccessService(guilds, servers)` with `listServers(userId)` and `requireServer(userId, serverId)`, which returns `{ id, name, icon }`. Expected: PASS.
4. Adapters:
   - `discord-guilds.ts`: exported `discordGuilds: UserGuilds` calls a module-private `'use cache'` function `guildsOf(userId)` (unexported, as Step 4 of the Next.js guide advises) with `cacheLife({ stale: 30, revalidate: 59, expire: 60 })` (D8). Inside: `prisma.account.findFirst({ where: { userId, providerId: "discord" }, select: { id: true } })`; no row throws `SignInRequired`. Then `auth.api.getAccessToken({ body: { accountId: account.id, userId } })`; on a Better Auth `APIError`, throw `SignInRequired` (D10). Then `fetch(\`${env.DISCORD_API_URL}/users/@me/guilds\`, { headers: { authorization: \`Bearer ${accessToken}\` } })`; 401 throws `SignInRequired`, any other non-2xx throws an `Error`with the status (no hidden error). Map each guild to`UserGuild`here.`DISCORD_API_URL`comes from`dashboardEnv.parse(process.env)` at call time.
   - `server-repository.ts`: `presentIds` with `prisma.server.findMany({ where: { id: { in: ids } }, select: { id: true } })`.
   - `index.ts`: `export const accessService = createAccessService(discordGuilds, prismaPresentServers)`.
5. Check: `yarn lint`, `yarn typecheck`, `yarn test` exit 0.
6. Commit: `feat(dashboard): check server rights against discord`.

### Task 5 — End-to-end sign-in stub and Discord mock

TDD exception: test infrastructure. Its check is the existing e2e suite still passing with the new servers running.

Files: `apps/dashboard/{package.json,playwright.config.ts}`, `e2e/{auth,discord-mock}.mts`.

1. `yarn workspace dashboard add -D @next/env@16.4.6`.
2. `playwright.config.ts`: replace the template's commented `dotenv` lines with `loadEnvConfig(process.cwd())` from `@next/env` (D15). `webServer` becomes an array: the mock first (`command: "node e2e/discord-mock.mts"`, `port: 3001`), then the existing standalone server with `env: { DISCORD_API_URL: "http://localhost:3001" }`.
3. `e2e/discord-mock.mts`, a Node `http` server. `GET /users/@me/guilds` answers by token:
   - `Bearer manager`: the seeded server `81384788765712384` "Welcomer test server" (owner); "Beta absent" `222078108977594368` (`"32"`); "Alpha absent" `222078108985982976` (`"8"`); "Not managed" `222078108994371584` (`"2048"`).
   - `Bearer none`: one guild with `"0"`.
   - `Bearer revoked`: 401.
     Anything else: 404. No other route.
4. `e2e/auth.mts`: `signInAs(context, token)` builds the test-only instance once (`prismaAdapter(prisma, { provider: "postgresql" })`, `secret: process.env.BETTER_AUTH_SECRET`, `plugins: [testUtils()]`), then `saveUser(createUser({ name: "Alex" }))`, `prisma.account.create({ data: { id, userId, providerId: "discord", accountId: <unique digits>, accessToken: token, accessTokenExpiresAt: <now + 1 year> } })`, and `context.addCookies(await test.getCookies({ userId, domain: "localhost" }))`. It returns the user id.
5. Check: `DATABASE_URL=postgresql://welcomer:welcomer@localhost:5432/welcomer_test yarn turbo run db:seed`, then the same `DATABASE_URL` in front of `yarn e2e`: the slice 1 specs pass, and the mock answers `curl -H 'authorization: Bearer manager' localhost:3001/users/@me/guilds` while Playwright runs. Checked at build, see Build results.
6. Commit: `test(dashboard): stub sign-in and discord for end-to-end tests`.

### Task 6 — Header, sign-in and sign-out (e2e first)

Files: `apps/dashboard/src/app/{layout,header,user-menu}.tsx`, `src/app/sign-in/{page,sign-in-button}.tsx`, `src/app/dashboard/page.tsx` (minimal: heading only, completed in Task 7), `e2e/sign-in.spec.mts`.

1. Write `e2e/sign-in.spec.mts` first:
   - `R-ACC-12: a visitor opening a signed-in page goes to the sign-in, with the page to come back to`: open `/servers/81384788765712384/images`; expect URL `/sign-in?callbackURL=%2Fservers%2F81384788765712384%2Fimages`.
   - `R-ACC-1, R-PRV-2: the Discord sign-in asks only for identity and servers`: `page.route("https://discord.com/**", (route) => route.abort())`, click "Sign in with Discord", catch the request with `page.waitForRequest`; its `scope` is `identify guilds`, it has no `email`, and its `redirect_uri` ends with `/api/auth/callback/discord`. No request reaches Discord.
   - `R-ACC-4: signing out ends this device's session only`: sign in twice as `manager` in two browser contexts (two sessions). In the first, the header shows "Alex"; keep its cookies, click "Sign out", expect `/`. A third context with the kept cookies opens `/dashboard` and lands on `/sign-in`. The second context still opens `/dashboard`.

   Run `yarn e2e`. Expected: FAIL.

2. Header (D13): `header.tsx` is a Server Component rendered by `layout.tsx` above `{children}`, with HeroUI `Link`s "Welcomer" (`/`) and "Status" (`/status`); "Support" inside `<Suspense fallback={null}>` in an async component that calls `await connection()` then reads `SUPPORT_SERVER_URL`. `user-menu.tsx` (`"use client"`): `authClient.useSession()`; while pending nothing; no session: a `Link` "Sign in" to `/sign-in`; else `Avatar` with `user.image` and `user.name`, and a `Button` "Sign out" that calls `authClient.signOut()` then `router.push("/")`.
3. Sign-in (D6): `page.tsx` is static, with heading "Sign in" and `<Suspense>` around `sign-in-button.tsx` (`"use client"`), which reads `callbackURL` with `useSearchParams()` (default `/dashboard`) and calls `authClient.signIn.social({ provider: "discord", callbackURL })`.
4. `dashboard/page.tsx`: heading "Your servers", then `<Suspense>` around an async component that calls `currentUser("/dashboard")`.
5. Run `yarn e2e`. Expected: PASS. `yarn build` still exits 0 without a database or environment (slice 1, D11).
6. Commit: `feat(dashboard): add header, sign-in and sign-out`.

### Task 7 — Dashboard home and invitation (e2e first)

Files: `apps/dashboard/src/app/dashboard/page.tsx`, `e2e/dashboard.spec.mts`.

1. Write `e2e/dashboard.spec.mts` first:
   - `R-ACC-10: lists the managed servers, those with the bot first, each group alphabetical`: as `manager`, the list items read in order "Welcomer test server", "Alpha absent", "Beta absent"; "Not managed" is absent; the first is a link to `/servers/81384788765712384`.
   - `R-SRV-1: a server without the bot offers the invitation for that server, in a new tab`: the "Invite the bot" link of "Alpha absent" has `target="_blank"`, and its `href` holds `guild_id=222078108985982976`, `disable_guild_select=true` and `permissions=52224`.
   - `R-ACC-11: a user who manages no server sees a message`: as `none`, "You do not manage any server yet." and no list.
   - `R-ACC-2: when Discord no longer accepts the authorization, the user signs in again and comes back`: as `revoked`, opening `/dashboard` lands on `/sign-in?callbackURL=%2Fdashboard`.

   Run `yarn e2e`. Expected: FAIL.

2. In the async part of `dashboard/page.tsx`: `const user = await currentUser("/dashboard")`, then `accessService.listServers(user.id)`; `SignInRequired` maps to `redirect(signInPath("/dashboard"))`, anything else is rethrown. Render a list: `Avatar` (D17) and name; present servers link to `/servers/<id>`; absent ones show a HeroUI `Link` "Invite the bot" to `inviteUrl(DISCORD_CLIENT_ID, id)` with `target="_blank" rel="noopener noreferrer"`. Empty list: the R-ACC-11 text (D18).
3. Run `yarn e2e`. Expected: PASS.
4. Commit: `feat(dashboard): list managed servers with invitation`.

### Task 8 — Server pages shell with tabs (e2e first)

Files: `apps/dashboard/next.config.ts`, `src/app/servers/[serverId]/{server-shell,server-tabs}.tsx`, `access.ts`, `{configurations,images,statistics}/page.tsx`, `e2e/servers.spec.mts`.

1. Write `e2e/servers.spec.mts` first, as `manager`:
   - `R-ACC-8: a server with the bot opens on its configurations, with icon, name, home link and three tabs`: open `/servers/81384788765712384`; URL ends with `/configurations`; the heading "Welcomer test server", the "W" avatar fallback, a link to `/dashboard`, and the tabs "Configurations" (selected), "Images", "Statistics".
   - `R-ACC-8: the tabs move between the server pages`: click "Statistics"; URL ends with `/statistics` and the tab is selected.
   - `R-ACC-9: a server without the bot sends the user home`: `/servers/222078108985982976/images` lands on `/dashboard`.
   - `R-ACC-9: a server the user does not manage sends the user home`: `/servers/222078108994371584/configurations` lands on `/dashboard`.

   Run `yarn e2e`. Expected: FAIL.

2. `next.config.ts`: `async redirects() { return [{ source: "/servers/:serverId", destination: "/servers/:serverId/configurations", permanent: false }]; }` (D12).
3. `access.tsx` (handler helper): `requireServerPage(serverId, path)` = `currentUser(path)`, then `accessService.requireServer(user.id, serverId)`; `NoAccess` maps to `redirect("/dashboard")` (R-ACC-9), `SignInRequired` to `redirect(signInPath(path))` (R-ACC-2). The 60-second rule (R-ACC-7) comes from D8 and needs no code here.
4. `layout.tsx`: static wrapper; inside `<Suspense>`, an async component awaits `params`, calls `requireServerPage(serverId, \`/servers/${serverId}/configurations\`)`and renders`Avatar`, heading, a `Link`"All servers" to`/dashboard`, and `<ServerTabs serverId={…} />`. `server-tabs.tsx` (`"use client"`): HeroUI `Tabs`with`selectedKey`= last segment of`usePathname()`, and each `Tabs.Tab`with`id`, `href`and`render={(props) => <NextLink {...props} />}` (D12).
5. Each tab page: static heading ("Configurations", "Images", "Statistics"), then `<Suspense>` around an async component that calls `requireServerPage(serverId, <its path>)` and renders nothing else yet (D5, D18).
6. Run `yarn e2e`. Expected: PASS. `yarn build` exits 0 without environment.
7. Commit: `feat(dashboard): add server pages shell with tabs`.

### Task 9 — Session cleanup job in the bot (test first)

Files: `apps/bot/src/bot/jobs/*`, `apps/bot/src/bot/index.ts`, `apps/bot/src/test/database.ts`.

1. Fixtures in `src/test/database.ts`: `resetUsers()` (`prisma.user.deleteMany()`, sessions and accounts cascade) and `aUserWithSessions({ createdAt, sessionsEndingAt })`.
2. Write the tests first:
   - `session-service.test.ts`, against the database, fixed clock `2026-03-08T00:05:00Z`: `R-PRV-3: deletes ended sessions, then the accounts left without a session` (Gherkin example: Alex's only session ended 8 March 00:00, so Alex and the session are gone; Sam has one ended and one live session, so Sam stays with one; Kim with one live session stays; Lee, created 30 seconds before the run and not yet holding a session, stays). Every other user is created a day before the run.

   Run `yarn test --filter=bot -- src/bot/jobs`. Expected: FAIL.

3. Code:
   - `session-repository.ts`: `deleteEndedSessions(now)` with `prisma.session.deleteMany({ where: { expiresAt: { lte: now } } })`, then `deleteUsersWithoutSession(createdBefore)` with `prisma.user.deleteMany({ where: { sessions: { none: {} }, createdAt: { lt: createdBefore } } })`.
   - `session-service.ts`: `createSessionJob(repository, clock)` reads `now = clock()`, then runs both, in that order, with `createdBefore = now - 60_000` (D14).
   - `schedule.ts`: `runHourly(job, logger)` runs the job once, then `setInterval(…, 3_600_000)`; a failure is logged at level error, as data-model.md says. No test: it is two timer calls. No new dependency.
   - `index.ts` calls `runHourly(sessionJob, logger)` after wiring the services.
4. Expected: PASS. `yarn lint`, `yarn typecheck` and `yarn test` exit 0.
5. Commit: `feat(bot): delete ended sessions and their accounts hourly`.

### Task 10 — Write the results back into the docs

After Tasks 1 to 9 and the owner's live check (Task 12). Remove each **[verify at build]** marker once its result is written, with its source.

- `contracts.md`:
  - "Database: who writes what": `user`, `session` (and `account` by cascade) are also deleted by the bot's `sessions` job (D14).
  - "Dashboard to Discord: user calls": scopes verified (D1), remove the marker; one call, no `after` loop (D7); the 60-second cache is `use cache` with `cacheLife` (D8).
- `data-model.md`, scheduled jobs: "once at start, then every hour" in place of "every day at 00:05 UTC"; the scheduler exists from slice 2 with `sessions` only, and slice 5's idempotent `partitions` job shares it (D14).
- `architecture.md` 5.4: add `/sign-in`, "sign-in page, then Discord" (D6); `/servers/[serverId]` redirect is in `next.config.ts` (D12).
- `development.md`: Tools gain `@next/env`; tests locally: the stub through Better Auth's test plugin and the Discord mock on port 3001, marker removed (D15).
- `docs/adr/0006…` "More Information": the default scopes are `identify` and `email`, replaced with `disableDefaultScope` (D1); sessions are refreshed by the browser only (D4).
- The Build results of this plan.

Check: `yarn format` exits 0. Commit: `docs: record slice 2 verification results`.

### Task 11 — Pull request

1. Push `feat/slice-2-sign-in` and open `feat: sign-in and servers (slice 2)`, with the rule IDs of the scope.
2. Check: every required check is green. After the merge, CI on `main` is green and `images.yml` pushes both images.
3. Then the independent review of the slice, against these documents.

### Task 12 — Live check (owner, real Discord credentials)

CI cannot run these steps. They need the owner's development application, with the redirect `http://localhost:3000/api/auth/callback/discord` ([development, local setup](../technical/development.md#local-setup) step 1).

1. `yarn dev` with the real `apps/dashboard/.env` and `apps/bot/.env`.
2. R-ACC-1, R-PRV-2: "Sign in with Discord" shows Discord's consent with "Access your username, avatar, and banner" and "Know what servers you're in", and no email line. After consent, `/dashboard` shows the owner's managed servers. In the database, `user.email` is `<discord id>@discord.placeholder.invalid` and `account.scope` is `identify,guilds` or `identify guilds`.
3. R-ACC-12: signed out, open `/servers/<test server>/images`, sign in: the browser comes back to that page.
4. R-ACC-10, R-SRV-1: the test server is first; a server without the bot has "Invite the bot", which opens Discord in a new tab with that server chosen and locked, asking for the four permissions of R-SRV-2. Invite, come back, reload: the server moves to the first group.
5. R-ACC-7, R-ACC-9: on the test server, remove the owner's second account's "Manage Server" role (or use a second account with a role). Within 60 seconds, a reload of a server page sends that account to `/dashboard`. Kick the bot: the next server page sends the owner home at once.
6. R-ACC-4: sign in on two browsers; sign out on one; the other still works.
7. R-ACC-3, D4: after sign-in, note the `better-auth.session_token` cookie's expiry. Set the session's `updatedAt` and `expiresAt` back by two days in the database, reload a page: the cookie's expiry moves 7 days ahead and `expiresAt` too.
8. R-ACC-2: set `account.access_token_expires_at` in the past, reload `/dashboard`: the list still shows, and the row has a new token and expiry. Revoke the application in Discord's "Authorized Apps", wait 60 seconds, reload: the browser goes to `/sign-in` with the page in `callbackURL`.
9. R-PRV-3: set a session's `expiresAt` in the past for a user with no other session, restart the bot: the user, its account and its session are gone.

Report each result in the pull request, and write the [verify at build] results in Task 10.

## Build results (2026-11-21)

Built on branch `feat/slice-2-sign-in`, tasks 1 to 9. The owner's live check (Task 12) has not run.

[verify at build] items checked by the build:

- D1: the authorization request of the sign-in test carries `scope=identify guilds`, and `disableDefaultScope` is what removes `email` (`@better-auth/core`, `social-providers/discord.mjs`). Written back in contracts.md and ADR-0006.
- D8 (1): a `SignInRequired` thrown inside the `use cache` scope reached the page without its class. The plan's fallback applies: the cached function returns `null` when Discord refuses the authorization (a failed token refresh or a 401), and the adapter throws `SignInRequired` outside it. Next.js documents returning `null` from a cached function for a missing result (`cacheLife.md`, conditional cache lifetimes).
- D8 (2): `auth.api.getAccessToken` with `accountId` and `userId` and no headers runs inside `use cache`; the end-to-end server list passes.
- D8, key: the cache key is the user id and the account's id and `updatedAt`, never the token (`authentication-with-cache-components.md`: keep tokens out of arguments), so signing in again, which rewrites the account, is not served a cached refusal.
- D15: Playwright loads `@repo/database` and its generated client in specs that are `.mts` files (see deviations). `@next/env` keeps an already-set `DATABASE_URL`: the end-to-end run uses `welcomer_test`. The Discord mock answers on port 3001 and the dashboard reads it through `DISCORD_API_URL`. Written back in development.md.
- D13: `yarn build` succeeds with `DATABASE_URL` unset, with the header's `SUPPORT_SERVER_URL` read under `connection()`.
- D12: HeroUI `Tabs` with `href` and `next/link` in `render` renders an `<a href>` whose `aria-selected` follows `selectedKey`, in Chromium, Firefox and WebKit.
- Quality gate on the final tree: `yarn e2e` 51 passed in 3 browsers; `yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` exit 0.

Pending owner live check (Task 12), **[verify at build]** kept where it stands:

- D4: the session cookie's `Max-Age` is renewed after `updateAge` through the header's `useSession` call.
- The real Discord consent screen with the two scopes, and the real token refresh.

Fixes and deviations, each at its root:

- No `layout.tsx` for the server pages (D5, D12). Each page calls `requireServerPage` and renders a shared `ServerShell`. Next.js: "be cautious when doing checks in Layouts as these don't re-render on navigation, meaning the user session won't be checked on every route change" (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`); a layout also does not know the page path that the sign-in `callbackURL` needs.
- End-to-end helpers and specs that create users are `.mts`: they import the Prisma 7 client, which uses `import.meta`, and Playwright compiles `.ts` files of the CommonJS dashboard package to CommonJS and loads `.mts` files as ES modules (Playwright, `fileIsModule`).
- The Discord mock uses server ids that the bot's database tests do not write, so the end-to-end list does not depend on what those tests leave.
- D8 fallback as above: `null` from the cached function, error thrown outside it.
- The R-PUB-9 check waits for hydration: the timer is set at hydration, which can come after the heading is visible, so the test fast-forwards until the refresh is seen (Playwright, `expect.toPass`).
- The tab click in `servers.spec.mts` retries with `expect(...).toPass()`. In WebKit a click before the streamed boundary hydrates is lost: React Aria's `Tab` calls `preventDefault` on a click that no press opened (`react-aria/dist/private/selection/useSelectableItem.mjs`: `if (!openLink.isOpening) e.preventDefault()`), and React's replayed click has no press. A person cannot click in that window; the test can. No product code changed.
- `@heroui/react` 3.2.7's peer dependencies (`react-aria`, `react-aria-components`, `@react-aria/utils`, `@react-aria/ssr`, `@internationalized/date`) are installed: Yarn does not install peers, and the first HeroUI component failed the build with "Can't resolve '@react-aria/utils'". HeroUI quick start: "Install @heroui/react and @heroui/styles plus any missing mandatory peer dependencies."
- `server-only` is imported but not installed: Next.js handles it internally (`data-security.md`).
- Tab pages show an `h2` with the tab name beside the server's `h1` (D18: heading only).
- D14: the scheduler starts in the bot before it connects to RabbitMQ; a database failure is logged, not fatal. The interval is never cleared (the job lives as long as the process). Lint rules forced braces and `String()` in `schedule.ts`.

Accepted: a click on a tab before hydration is lost (library behaviour, rare in practice).

## Done when

- [ ] Every rule of slice 2 is implemented, with tests written first that name the rule, failing without their code (definition of done 1):
  - R-ACC-5, R-ACC-10, R-SRV-1, R-SRV-2 in `packages/domain` (R-ACC-6 by D9's field choice);
  - R-ACC-8, R-ACC-9 in `access-service.test.ts`;
  - R-PRV-2 in `auth.test.ts`;
  - R-PRV-3 in `session-service.test.ts`;
  - R-ACC-1, R-ACC-2, R-ACC-4, R-ACC-8 to R-ACC-12, R-SRV-1, R-PRV-2 in `e2e/{sign-in,dashboard,servers}.spec.mts`.
    R-ACC-3 and R-ACC-7 are settings of Better Auth and of `cacheLife`, checked live (Task 12). R-PRV-1 is the absence of other data: checked live (Task 12, step 2) and in review. No test covers Better Auth, Discord, Next.js caching or HeroUI.
- [ ] Sign-in, sessions, rights, server list, invitation and the server pages shell work (roadmap, slice 2).
- [ ] The quality gate passes on `main` without Discord credentials, and both images are on GHCR (definition of done 2).
- [ ] Architecture rules (definition of done 3): the domain has no infrastructure import; pages call the DAL and one service; the service depends on ports; adapters map Discord and Prisma shapes; errors are typed and mapped to redirects in the pages.
- [ ] An independent review found nothing left to fix (definition of done 4).
- [ ] Every slice-2 **[verify at build]** item is checked and written back (Task 10, definition of done 5).
- [ ] The owner's live check (Task 12) passed.

## Owner decisions needed

None blocking. Two decisions change technical documents, each with its source, and the review should confirm them:

- D14 runs the scheduled jobs every hour instead of daily at 00:05 UTC (data-model.md); the business rules stay unchanged.
- D7 drops the 200-server pagination of contracts.md.

## Open risks

- D4 rests on Better Auth source, not on a documented guarantee: if the header's `useSession` call does not run (JavaScript off), the session cookie is not extended. Live check step 7.
- D8: whether `use cache` keeps a thrown error's class and leaves it uncached, and whether `getAccessToken` reads no request API under it.
- D16: Discord tokens are stored unencrypted in the database, the Better Auth default; `account.encryptOAuthTokens: true` is the documented option if the owner wants it.
- D10: a Discord outage during a token refresh sends the user to sign-in.
- The client router may reuse a server page for up to 30 seconds (`stale` minimum), on top of the 60-second server cache. Every Server Action re-checks rights on the server from slice 3.

## Not verified

- The bundled Next.js docs were read in the main checkout's `node_modules` (same `next` 16.4.6); the worktree had none. Task 1 re-reads them.
- Discord's permission bit values (D9) and the guild icon URL format (D17): the pages were not re-fetched for this plan.
- HeroUI `Tabs` with `href` and `next/link` in `render` works in the three browsers, but is shown in one HeroUI example only and is not documented as an API (D12). No `RouterProvider` is set, so React Aria opens the link by a synthetic click on the anchor, which `next/link` handles.
- Pending the owner live check (Task 12): the session cookie renewal (D4), the real Discord consent screen and the real token refresh.
