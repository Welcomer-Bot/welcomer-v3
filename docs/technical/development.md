# Development

How to work on Welcomer locally, and the conventions every change follows. Pipelines are in [CI](./ci-cd.md), tests in the [test strategy](./test-strategy.md).

## Tools

| Tool        | Version                                                                                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js     | the Active LTS when the repository is created: 26 on 2026-11-20 ([Node.js release schedule](https://github.com/nodejs/release#release-schedule): "Production applications should only use Active LTS or Maintenance LTS releases"), pinned in `.nvmrc` and `engines`; 26.13.1 in slice 0 |
| Corepack    | 0.36.0. Node 25 and later no longer ship it: `npm install -g corepack@0.36.0 && corepack enable` ([Yarn, install](https://yarnpkg.com/getting-started/install): "Install Corepack… `npm install -g corepack`")                                                                           |
| Yarn        | latest stable, through Corepack and the `packageManager` field; 4.18.1 in slice 0                                                                                                                                                                                                        |
| Docker      | Engine with the Compose plugin, for PostgreSQL and RabbitMQ; images `node:26.13.1-slim`, `postgres:17-alpine`, `rabbitmq:4.4-management`                                                                                                                                                 |
| Turborepo   | 2.11.13                                                                                                                                                                                                                                                                                  |
| Next.js     | 16.4.6, React 19.3.0 (the `create-next-app` pins)                                                                                                                                                                                                                                        |
| TypeScript  | 5.9.3: typescript-eslint 8.73.0 accepts `>=4.8.4 <6.1.0`                                                                                                                                                                                                                                 |
| ESLint      | 9.39.5, the major `create-next-app` writes; typescript-eslint 8.73.0, eslint-config-next 16.4.6                                                                                                                                                                                          |
| Prettier    | 3.10.1, defaults                                                                                                                                                                                                                                                                         |
| HeroUI      | @heroui/react and @heroui/styles 3.2.7, Tailwind CSS 4.3.3                                                                                                                                                                                                                               |
| Prisma      | prisma, @prisma/client, @prisma/adapter-pg 7.10.1                                                                                                                                                                                                                                        |
| Better Auth | better-auth 1.7.26 and its CLI `auth` 1.7.26 (1.7.27 was still in Yarn's 24-hour quarantine on 2026-11-20)                                                                                                                                                                               |
| Zod         | 4.6.7                                                                                                                                                                                                                                                                                    |
| Vitest      | 5.1.1 with `vite` 8, `@vitejs/plugin-react` 6.3.0, jsdom 31.0.1, Testing Library                                                                                                                                                                                                         |
| Playwright  | @playwright/test 1.65.1                                                                                                                                                                                                                                                                  |
| discordeno  | @discordeno/bot 22.0.0-beta.2, from the `examples/bigbot` template at commit `a6a17cc` ([slice 1, D1](../plans/1-bot-online.md))                                                                                                                                                         |
| Bot runtime | amqplib 2.4.0, fastify 5.12.8, @fastify/multipart 10.1.9, pino 10.4.0                                                                                                                                                                                                                    |

The lockfile pins every other version. Yarn 4 refuses versions published less than 24 hours ago by default ([Yarn, `npmMinimalAgeGate`](https://yarnpkg.com/configuration/yarnrc#npmMinimalAgeGate), default 1440 minutes): the default is kept, so a fresh release installs a day later. create-turbo writes `devEngines.packageManager` with the Yarn found on the machine, and Corepack enforces it ([Corepack, `devEngines.packageManager`](https://github.com/nodejs/corepack#devenginespackagemanager)): it holds the Yarn version above.

Yarn uses `nodeLinker: node-modules`. Yarn's default is `pnp` ([Yarn, nodeLinker](https://yarnpkg.com/configuration/yarnrc#nodeLinker)); neither the Turborepo nor the Next.js docs mention Plug'n'Play, so the classic layout is kept for tool compatibility. Checked in slice 0: with this linker, Node runs the bot's TypeScript without a loader, Next.js standalone output copies its `node_modules`, and the Docker builds install the `turbo prune` output with `yarn install --immutable`. Plug'n'Play was not tried.

## Local setup

1. Create a development application in the Discord Developer Portal, with the bot, the `GUILD_MEMBERS` intent and the redirect `http://localhost:3000/api/auth/callback/discord`; invite it to a test server.
2. `docker compose -f compose.dev.yaml up -d`: PostgreSQL and RabbitMQ.
3. Copy each app's `.env.example` to `.env` and fill it ([environment variables](#environment-variables)).
4. `yarn install`, then `yarn db:migrate` and `yarn db:seed`: one server, the bot status with 2 connections and their 2 connection rows, all dated 2026-01-01. Configurations and images join the seed in slices 3 and 4.
5. `yarn dev`: Turborepo starts gateway, rest, bot and dashboard. The gateway asks `rest` for `GET /gateway/bot` at start; if `rest` is not listening yet, the gateway exits and `node --watch` waits for a file change, so restart it **[verify at build: owner live check, slice 1 Task 12]**.

## Environment variables

Checked at start by a Zod schema in each app ([architecture, 8.1](./architecture.md#81-rules-for-the-dashboard)).

| Variable                | Used by                               | What                                                                                               |
| ----------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | gateway, bot, dashboard, migrations   | Supabase session pooler URL                                                                        |
| `RABBITMQ_URL`          | gateway, bot                          | queue                                                                                              |
| `DISCORD_TOKEN`         | gateway, rest, bot, register-commands | bot token; the bot needs it because discordeno derives the application identifier from it          |
| `DISCORD_CLIENT_ID`     | rest, dashboard, register-commands    | application identifier                                                                             |
| `DISCORD_CLIENT_SECRET` | dashboard                             | OAuth2 secret                                                                                      |
| `REST_PROXY_URL`        | gateway, bot, dashboard               | internal address of `rest`                                                                         |
| `REST_PROXY_SECRET`     | gateway, rest, bot, dashboard         | shared secret header                                                                               |
| `BETTER_AUTH_SECRET`    | dashboard                             | signing secret                                                                                     |
| `BETTER_AUTH_URL`       | dashboard                             | public address, `https://welcomer.app`                                                             |
| `ADMIN_DISCORD_IDS`     | dashboard                             | admins (R-ADM-2)                                                                                   |
| `SUPPORT_SERVER_URL`    | bot, dashboard                        | support server link (R-PUB-11)                                                                     |
| `DASHBOARD_URL`         | bot                                   | dashboard link in `/help` (R-CMD-1); `https://welcomer.app/dashboard` in production                |
| `LOG_LEVEL`             | all                                   | `info` in production, `debug` locally                                                              |
| `DISCORD_API_URL`       | dashboard                             | Discord API base for user calls; default `https://discord.com/api/v10`, a mock in end-to-end tests |

## Architecture rules

Strict, checked in review:

- **Dependency rule** ([Clean Architecture, R. C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)): source code dependencies point inwards only. `packages/domain` imports nothing from Prisma, Discord, discordeno, Next.js or the apps. Each package imports only what its `package.json` declares.
- **Ports and adapters**: the domain and the services define the interfaces they need (repositories, Discord, clock); the apps implement them at the edge and wire them at start. Services never import an adapter.
- **Layers** of [architecture 5.3](./architecture.md#53-layers-inside-each-app): handlers, then services, then repositories. A handler never calls a repository; a service never builds an HTTP response or a Discord reply.
- **Separate types**: domain types never carry Prisma, Discord or HTTP types; mapping happens in the adapter.
- **Errors**: services throw typed domain errors; handlers map them ([architecture 8](./architecture.md#8-crosscutting-concepts)). No `catch` that hides an error.
- **SOLID** where it brings something: one responsibility per module; no interface with a single implementation unless it is a port.
- **Review**: an independent review at the end of each roadmap slice checks these rules and the docs.

## Conventions

- Write as little code as possible: generate it with the tools' official generators first, then remove duplication by refactoring.
- A bug is fixed at its root: read all the code involved, then make one global fix. Never a patch on a configuration or a workaround around the cause.
- Nothing exotic: only documented, widely used solutions; anything else is rejected in review.
- Each tool keeps the setup its official initializer writes: `create-turbo`, `create-next-app` (TypeScript, ESLint, Tailwind, App Router, `src/`, alias `@/*`), the HeroUI install guide, `prisma init`, the Better Auth CLI. Settings change only for a documented reason.
- TypeScript `strict`, as `create-next-app` sets it. ESLint: the configuration `create-next-app` writes (`eslint-config-next` core web vitals and TypeScript), plus typescript-eslint `strictTypeChecked` and `stylisticTypeChecked` with typed linting (`parserOptions.projectService: true`), shared from `config-eslint`. Next.js says to "spread the Next.js config into your array" ([Next.js, ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)); typescript-eslint advises the strict preset only when developers are "highly proficient in TypeScript" and marks it not semver-stable ([typescript-eslint, configs](https://typescript-eslint.io/users/configs#strict-type-checked)): accepted, and the lockfile pins it. Prettier with its defaults.
- Schemas: Zod, in `packages/domain` for the message and image shapes, and per app for environment variables.
- Folders: Next.js "is unopinionated about how you organize" files ([Next.js, project structure](https://nextjs.org/docs/app/getting-started/project-structure)). Welcomer keeps routes in `src/app`, and services and repositories in `src/server/<domain>/`, the layers of [architecture 5.3](./architecture.md#53-layers-inside-each-app).
- Branches: `<type>/<short-description>`, with the types of [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (`feat/editor-preview`).
- Pull requests: a template asks for what changes, the rule IDs it implements and how it was tested.

## Tests locally

- Database tests use a separate `welcomer_test` database, so they never wipe the development data. Create it once with `docker compose -f compose.dev.yaml exec postgres createdb -U welcomer welcomer_test`, migrate it after each new migration with `DATABASE_URL=postgresql://welcomer:welcomer@localhost:5432/welcomer_test yarn turbo run db:deploy`, and put the same `DATABASE_URL` in front of `yarn test`. CI uses a fresh `welcomer` database.
- End-to-end tests read the seed, as CI does, so run them on `welcomer_test` freshly seeded: the database tests empty its tables. `DATABASE_URL=postgresql://welcomer:welcomer@localhost:5432/welcomer_test yarn turbo run db:seed`, then the same `DATABASE_URL` in front of `yarn e2e`; the dashboard's process environment wins over its `.env`.
- One test file: `yarn test --filter=<workspace> -- <path>`, path relative to the workspace. Turborepo passes the arguments after `--` to every task of the run ([Turborepo, run](https://turborepo.dev/docs/reference/run)), so without `--filter` the other workspaces fail with "No test files found".
- WebKit needs system libraries: `sudo yarn workspace dashboard playwright install-deps` once per machine; CI installs them with `playwright install --with-deps`.
- Vitest: Discord REST is mocked with MSW in Node ([MSW](https://mswjs.io/docs)).
- End-to-end: the built dashboard calls a small mock server, set through `DISCORD_API_URL` and `REST_PROXY_URL`, since MSW in the test process cannot reach the dashboard's own process.
- End-to-end sign-in is stubbed: the test creates a user and a session in the database and sets the session cookie, so no Discord account is needed **[verify at build: Better Auth test helpers]**.
