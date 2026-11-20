# Development

How to work on Welcomer locally, and the conventions every change follows. Pipelines are in [CI](./ci-cd.md), tests in the [test strategy](./test-strategy.md).

## Tools

| Tool    | Version                                                                                       |
| ------- | --------------------------------------------------------------------------------------------- |
| Node.js | the Active LTS when the repository is created: 26 on 2026-11-20 ([Node.js release schedule](https://github.com/nodejs/release#release-schedule): "Production applications should only use Active LTS or Maintenance LTS releases"), pinned in `.nvmrc` and `engines` |
| Yarn    | latest stable, through Corepack and the `packageManager` field                                 |
| Docker  | Engine with the Compose plugin, for PostgreSQL and RabbitMQ                                   |

Yarn uses `nodeLinker: node-modules`. Yarn's default is `pnp` ([Yarn, nodeLinker](https://yarnpkg.com/configuration/yarnrc#nodeLinker)); neither the Turborepo nor the Next.js docs mention Plug'n'Play, so the classic layout is kept for tool compatibility **[verify at build]**.

## Local setup

1. Create a development application in the Discord Developer Portal, with the bot, the `GUILD_MEMBERS` intent and the redirect `http://localhost:3000/api/auth/callback/discord`; invite it to a test server.
2. `docker compose -f compose.dev.yaml up -d`: PostgreSQL and RabbitMQ.
3. Copy each app's `.env.example` to `.env` and fill it ([environment variables](#environment-variables)).
4. `yarn install`, then `yarn db:migrate` and `yarn db:seed`: one server, one welcome and one goodbye configuration, one image.
5. `yarn dev`: Turborepo starts gateway, rest, bot and dashboard.

## Environment variables

Checked at start by a Zod schema in each app ([architecture, 8.1](./architecture.md#81-rules-for-the-dashboard)).

| Variable                | Used by                    | What                                                       |
| ----------------------- | -------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`          | gateway, bot, dashboard, migrations | Supabase session pooler URL                       |
| `RABBITMQ_URL`          | gateway, bot               | queue                                                      |
| `DISCORD_TOKEN`         | gateway, rest              | bot token                                                  |
| `DISCORD_CLIENT_ID`     | rest, dashboard            | application identifier                                     |
| `DISCORD_CLIENT_SECRET` | dashboard                  | OAuth2 secret                                              |
| `REST_PROXY_URL`        | bot, dashboard             | internal address of `rest`                                 |
| `REST_PROXY_SECRET`     | rest, bot, dashboard       | shared secret header                                       |
| `BETTER_AUTH_SECRET`    | dashboard                  | signing secret                                             |
| `BETTER_AUTH_URL`       | dashboard                  | public address, `https://welcomer.app`                     |
| `ADMIN_DISCORD_IDS`     | dashboard                  | admins (R-ADM-2)                                           |
| `SUPPORT_SERVER_URL`    | bot, dashboard             | support server link (R-PUB-11)                             |
| `LOG_LEVEL`             | all                        | `info` in production, `debug` locally                      |
| `DISCORD_API_URL`       | dashboard                  | Discord API base for user calls; default `https://discord.com/api/v10`, a mock in end-to-end tests |


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

- Vitest: Discord REST is mocked with MSW in Node ([MSW](https://mswjs.io/docs)).
- End-to-end: the built dashboard calls a small mock server, set through `DISCORD_API_URL` and `REST_PROXY_URL`, since MSW in the test process cannot reach the dashboard's own process.
- End-to-end sign-in is stubbed: the test creates a user and a session in the database and sets the session cookie, so no Discord account is needed **[verify at build: Better Auth test helpers]**.
