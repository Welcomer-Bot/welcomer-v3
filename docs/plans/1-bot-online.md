# Slice 1 — Bot online: implementation plan

**Goal.** The bot runs as three processes joined by RabbitMQ: gateway, rest and bot. It records the servers it joins and removes the ones it leaves, keeps their member counts, and answers `/help` and `/status`. The commands are registered with one bulk overwrite. A public status page shows every Discord connection. The quality gate proves all of it without Discord credentials.

**Scope** ([roadmap](../roadmap.md), slice 1). Covered here: R-SRV-2 to R-SRV-6, R-CMD-1, R-CMD-2, R-PUB-4 to R-PUB-9, the [contracts](../technical/contracts.md), and R-PRV-4 and R-PRV-6 where the bot touches member data or logs. Out of scope: deploy, monitoring, health endpoints, the page header (slice 2), configurations and `/test` (slice 3), statistics (slice 5). R-SRV-1 (invitation) belongs to slice 2. R-SRV-2 lives in the invitation link of [contracts](../technical/contracts.md#invitation-link), so this slice only checks it by hand (Task 12).

**Architecture summary.** `apps/bot` starts from discordeno's official [`examples/bigbot`](https://github.com/discordeno/discordeno/tree/main/examples/bigbot), commit `a6a17cc` of 2026-11-18. It keeps the template's folders and process split:

- `src/gateway`: the gateway manager and its worker threads hold the shards. They publish every event to RabbitMQ. Every 30 seconds they write the shard status.
- `src/rest`: the template's Fastify REST proxy, the only caller of Discord with the bot token.
- `src/bot`: the queue consumer, `createBot` through the proxy, events and commands. Its layers are handlers (`events/*`, `commands/*`), then services, then repositories.

Business rules that both apps share live in `packages/domain`: status vocabulary, the silence limit, the shard formula, the identifier check, server counting, and the variables list that `/help` shows. The status page lives in `apps/dashboard` at `src/app/status`, with its service and repository in `src/server/status/`. That is the layering of [development](../technical/development.md#architecture-rules). Domain types carry string snowflakes and plain dates. discordeno bigints and Prisma rows are mapped in the handlers and repositories.

**Method.** Each task follows [test strategy](../technical/test-strategy.md). Business rules get their test first: run it, see it FAIL, write the code, see it PASS. Template copies, schema and CI are TDD exceptions, and their check is the command they ship. Each task ends with one commit: Conventional Commits, no `Co-Authored-By` trailer. Work on branch `feat/bot-online`.

## Tech stack (npm registry, 2026-11-20)

Everything from [slice 0](./0-foundation.md#tech-stack-npm-registry-2026-11-20) is unchanged. Added in this slice:

| Package              | Version       | Note                                                                                                                                              |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@discordeno/bot`    | 22.0.0-beta.2 | The template's only discordeno dependency. Pinned exact with `-E` (D1). Its `^22.0.0-beta.2` sub-dependencies resolve to `22.0.0-beta.2` too      |
| `amqplib`            | 2.4.0         | Template dependency. It ships its own types (`"types": "./index.d.ts"` in its `package.json`), so the template's `@types/amqplib` is dropped (D3) |
| `fastify`            | 5.12.8        | Template dependency, used by the REST proxy only (D3)                                                                                             |
| `@fastify/multipart` | 10.1.9        | Template dependency of the REST proxy: it forwards file uploads, which slices 3 and 4 need                                                        |
| `pino`               | 10.4.0        | Logs, as [architecture 8.1](../technical/architecture.md#81-rules-for-the-dashboard) says (D10)                                                   |
| `vitest`, `vite`     | as slice 0    | Added to `packages/domain` for its tests                                                                                                          |

All of these were published more than 24 hours ago, so Yarn's `npmMinimalAgeGate` accepts them. `amqplib` 2.4.0 and `@fastify/multipart` 10.1.9 date from 2026-11-16. Images stay as in slice 0: `rabbitmq:4.4-management`, with no plugin (D4).

## Decisions and [verify at build] items resolved now

- **D1. discordeno `22.0.0-beta.2`, not a `next` build.** The npm tags on 2026-11-20 are `latest` 21.0.0, `beta` 22.0.0-beta.2 and `next` 22.0.1-next.0674dd9. `beta.2` is the last v22 release that discordeno published as a GitHub release, marked pre-release on 2026-08-28, with release notes. Each `next` build is an automatic snapshot of one `main` commit, and there are 360 of them. The template pins `22.0.1-next.9832342`, published 2026-06-09, which is older than `beta.2`. So `beta.2` is the newest named v22 version, and it already contains the template's own change "docs(bigbot): Send snake_case packets to bot" (from the `beta.2` release notes). The getting-started page names no tag: it says only `npm install discordeno` ([discordeno, getting started](https://discordeno.js.org/docs/getting-started)). This follows owner decision 8 of slice 0, and it deviates from "latest stable" ([CI, versions](../technical/ci-cd.md#versions)) on purpose. **[verify at build: the template type-checks against `beta.2`.]** If it does not, use the template's own pin `22.0.1-next.9832342` and record that here.
- **D2. Node 26 with type stripping, no `tsc` build.** The template builds to `dist/` with TypeScript 7, and states "anything above v22 should work" ([bigbot README](https://github.com/discordeno/discordeno/tree/main/examples/bigbot)). Slice 0 D7 runs `.ts` files with Node type stripping. So the template's `build` and `dist/` scripts are dropped, and its relative imports switch from `.js` to `.ts`. Its Node 18 polyfills are dropped too, since the template says they exist only for Node 18: `util.ts` is replaced by `Promise.withResolvers` and `import.meta.dirname`. **[verify at build]**, in Task 4:
  1. `node` runs a file in `packages/database` reached through the `node_modules/@repo/database` symlink.
  2. The Prisma-generated client loads under type stripping. Prisma says "the generated client uses `.js` extensions in its import statements", and its fix is `importFileExtension = "ts"` ([Prisma, generators](https://www.prisma.io/docs/orm/prisma-schema/overview/generators)). If the generated code uses syntax that is not erasable, Node's fallback `tsx` applies (slice 0 D7).
  3. `new Worker(<file>.ts)` runs under type stripping.
- **D3. Template parts dropped, each for a documented reason. The rest is kept as written.**

  | Template part                                                                                                                | Reason                                                                                                                                                                                                                                                                                                                                          |
  | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `rest/influx.ts`, `@influxdata/influxdb-client`, the InfluxDB service                                                        | no monitoring ([requirements, later](../requirements.md#later))                                                                                                                                                                                                                                                                                 |
  | HTTP event path (`MESSAGEQUEUE_ENABLE=false`, `bot/fastify.ts`, `EVENT_HANDLER_*`)                                           | the queue is always used ([ADR-0003](../adr/0003-discordeno-three-processes-rabbitmq.md))                                                                                                                                                                                                                                                       |
  | Gateway HTTP API (`gateway/fastify.ts`, `ShardPayload`, `EditShardsPresence`, `ShardInfoFromGuild`, `getShardInfoFromGuild`) | the bot reads shard data from `shard_status` ([contracts, database](../technical/contracts.md#database-who-writes-what)). No v3 feature sends a payload to a shard                                                                                                                                                                              |
  | `config.ts`, `dotenv`                                                                                                        | the existing Zod `env.ts` ([architecture 8.1](../technical/architecture.md#81-rules-for-the-dashboard)) and Node's `--env-file-if-exists`                                                                                                                                                                                                       |
  | `util.ts`                                                                                                                    | Node 18 polyfills (D2)                                                                                                                                                                                                                                                                                                                          |
  | `commands/ping.ts`, `devOnly`, `DEV_SERVER_ID`, `DEVELOPMENT`                                                                | the commands are `/help` and `/status`, global only ([contracts, Discord application](../technical/contracts.md#discord-application))                                                                                                                                                                                                           |
  | `utils/loader.ts` and the `bot.commands` collection                                                                          | `register-commands` must not build the bot, because its environment holds only the token and the application id (slice 0 owner decision 5). So the command definitions sit in a file with no runtime import, and the bot maps each name to its handler. An explicit list is type-checked, which the template's `.js` directory scan is not (D2) |
  | `events/nodejs.ts` webhook report, `utils/webhook.ts`                                                                        | no monitoring. Its `unhandledRejection` log line is kept                                                                                                                                                                                                                                                                                        |
  | `chalk` and the `logCommand` username                                                                                        | logs are JSON and never hold a member name (R-PRV-4)                                                                                                                                                                                                                                                                                            |
  | `chokidar`, `typescript@^7`, `@types/amqplib`                                                                                | unused; TypeScript 5.9.3 (slice 0 D3); amqplib ships its types                                                                                                                                                                                                                                                                                  |

  Kept as written: the worker-thread gateway with `SHARDS_PER_WORKER` 16 and `TOTAL_WORKERS` 4, as constants. Resharding is kept on, because discordeno's default is on: `enabled: options.resharding?.enabled ?? true` (`packages/gateway/src/manager.ts` at `22.0.0-beta.2`). The REST proxy and `createBot` through the proxy are kept too.

- **D4. Queue: RabbitMQ's work-queue pattern, no deduplication plugin.** The template publishes to an `x-message-deduplication` exchange, and that needs a third-party plugin and a custom image. The contract says "No deduplication" and asks for "one durable queue of the default classic type, persistent messages, manual acknowledgements, prefetch 100" ([contracts, event queue](../technical/contracts.md#gateway-to-bot-event-queue)). So both sides run `assertQueue("gateway-events", { durable: true })`:
  - The gateway publishes with `channel.sendToQueue(queue, body, { persistent: true, contentType: "application/json" })`. RabbitMQ's tutorial uses "`{persistent: true}`" ([RabbitMQ, work queues](https://www.rabbitmq.com/tutorials/tutorial-two-javascript)).
  - The bot calls `prefetch(100)`, consumes with `noAck: false` ("manual acknowledgment mode", same page), and acks after handling. On failure it logs and acks, with no retry (R-CFG-3, contracts).

  Both sides assert the queue, so no event published before the bot's first start is lost. The tutorial now shows a quorum queue, but the contract keeps a classic queue with its own source (one node). The template's reconnect loop is kept.

- **D5. Server count per connection (R-PUB-6) is a set of server identifiers, kept by each worker.** `READY` gives "the guilds of which your bot is a member" ([Discord, Ready](https://docs.discord.com/developers/events/gateway-events#ready)). `GUILD_CREATE` then arrives for each of them "to lazily load and backfill information for all unavailable guilds" ([Discord, Guild Create](https://docs.discord.com/developers/events/gateway-events#guild-create)). Adding the two would count each server twice. So the count is the size of a set:
  - `READY` replaces the set.
  - `GUILD_CREATE` adds to it.
  - `GUILD_DELETE` removes from it, unless "`unavailable` is `true`, the guild is currently unavailable" (same page).

  This rule is `countServers` in `packages/domain`. The pending shards of a resharding count too: the template's own `TODO` says to listen to `READY` there. Task 10 updates data-model.md, which says "guilds of READY, plus guild create, minus guild delete".

- **D6. Missed departures after `READY` (R-SRV-5) delete only servers joined before that `READY` was handled.** The bot handles up to 100 messages at once (prefetch 100), so a new server's `GUILD_CREATE` can be stored before the `READY` that precedes it is finished. Without a guard, that new server would be deleted. The service reads the clock synchronously when it gets `READY`. The repository then deletes the rows that meet all three conditions:
  - they belong to that shard by the formula;
  - they are absent from the list;
  - their `recorded_at` (the time the bot stored them) is earlier than that time.

  The path from the consumer callback to the service is synchronous, so a later `GUILD_CREATE` always reads a later clock:

  1. amqplib calls the consumer in delivery order.
  2. The callback calls `handleGatewayEvent`. Its template line `await bot.events.dispatchRequirements?.(…)` is removed: Welcomer sets no such hook, and that `await` was the only one before the handler.
  3. At `22.0.0-beta.2`, `handleReady` and `handleGuildCreate` call `bot.events.ready` and `bot.events.guildCreate` before any `await` (`packages/bot/src/handlers/`).
  4. The service reads `clock()` before its first `await`.

  Task 6 states this path in a one-line comment. The SQL runs the formula in PostgreSQL: `("id"::bigint >> 22) % ${count} = ${shardId}`. The shard count comes from the `READY` payload's `shard` pair, so the bot reads nothing else. Residual risk, accepted: a kick and a re-invite handled in the same instant may run out of order. Task 10 writes this guard into contracts.md.

- **D7. Who calls Discord.** The contract says rest "is the only caller of the Discord REST API with the bot token". The template's gateway calls `getGatewayBot` through the proxy, so `gatewayEnv` gains `REST_PROXY_URL` and `REST_PROXY_SECRET`. `createBot` needs `token`, since discordeno derives the application id from it, so `botEnv` gains `DISCORD_TOKEN`, as the template's `bot.ts` has it. discordeno reads both values at start: `getBotIdFromToken` runs `BigInt(atob(token.split('.')[0]))` (`packages/utils/src/token.ts` at `beta.2`). So the `.env.example` placeholders must parse: `DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.x.y` (base64 of 18 digits) and `DISCORD_CLIENT_ID=123456789012345678`. `register-commands` calls Discord directly with its own REST manager (slice 0 owner decision 5). Task 10 updates the environment table of development.md.
- **D8. REST proxy address.** The proxy listens on port 8000, the template's `REST_PORT` default and the `REST_PROXY_URL` of `.env.example`. Its host is `0.0.0.0`, because Fastify says "When deploying to a Docker… it is advisable to listen on `0.0.0.0`" ([Fastify, server](https://fastify.dev/docs/latest/Reference/Server/)). Both are constants written into contracts.md in Task 10: the port belongs to the internal contract, like the queue name, and is not a deployment setting.
- **D9. `/status` (R-CMD-2) reads `shard_status` and `bot_status`:**
  - "Connected" means that the connection serving this server is online after R-PUB-7. This interprets "connected or not". The connection's own state is the documented data that answers it.
  - The response time is the average latency of the connections that are online.
  - "Running since" and "memory used" come from the bot process, the part that "sends the messages": its start time and `process.memoryUsage().rss`.
  - The connection is `shardOf(serverId, shard_count)`.
- **D10. Logs with pino in `apps/bot`.** Architecture 8.1 says pino, with JSON lines and the fields `service`, `serverId` and `shardId`. The template's logger prints colours and usernames, which R-PRV-4 forbids. Each process creates `pino({ level: LOG_LEVEL, base: { service } })`. discordeno's internal logger keeps its default, because that is the library's own setting (framework default). The dashboard logs nothing new in this slice.
- **D11. Status page.**
  - It is the Server Component `src/app/status/page.tsx`. Its data part sits inside `<Suspense>` and calls `await connection()` before reading the clock and the database. Next.js says to "wrap the component in `<Suspense>` and provide a fallback UI", and to "defer to request time by calling `connection()`" ([Next.js, caching](https://nextjs.org/docs/app/getting-started/caching)). `cacheComponents` stays on (slice 0), and the build never reads the database.
  - A small client component calls `router.refresh()` every 30 seconds (R-PUB-9). Next.js describes it as "Refresh the current route. Making a new request to the server" ([Next.js, useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router)).
  - The lookup (R-PUB-8) is a GET form with `?server=<id>`, built with `next/form`. It changes nothing, so it needs no Server Action ([architecture 8.1](../technical/architecture.md#81-rules-for-the-dashboard), CSRF).
  - The total number of servers (R-PUB-4) is the sum of the per-connection counts, so the summary matches the lines.
  - Times show in UTC ([architecture 8](../technical/architecture.md#8-crosscutting-concepts), time).
- **D12. `bot_status` is a single row with `id integer primary key default 1`.** Prisma needs a unique field on each model. data-model.md lists only `started_at` and `shard_count`. Task 10 adds `id`.
- **D13. Dashboard link in `/help`: a new `DASHBOARD_URL` variable.** R-CMD-1 asks for a dashboard link. Architecture 8 says "All settings come from environment variables", so `botEnv` gains `DASHBOARD_URL`:
  - its value in production is `https://welcomer.app/dashboard` (R-PUB-11, route `/dashboard` of [architecture 5.4](../technical/architecture.md#54-dashboard-pages));
  - its value in `.env.example` is `http://localhost:3000/dashboard`;
  - it joins `turbo.json` `globalEnv` (slice 0 D13).

  The support link is `SUPPORT_SERVER_URL`.

- **D14. CI stays free of Discord.**
  - The domain rules are pure functions with an injected `now`.
  - The server rules run against the PostgreSQL service of the `test` job, which gets `DATABASE_URL` in its `env`.
  - The status page runs end to end on data from `yarn db:seed`, in an `e2e` job that gains a PostgreSQL service.
  - Locally, database tests use a separate `welcomer_test` database, so they never wipe the development data. Create it once with `docker compose -f compose.dev.yaml exec postgres createdb -U welcomer welcomer_test`. Then run `DATABASE_URL=postgresql://welcomer:welcomer@localhost:5432/welcomer_test yarn turbo run db:deploy` once per migration. Tests run with the same `DATABASE_URL` in front of `yarn test`. CI's PostgreSQL service is fresh on each run, so it uses `welcomer`.
- Nothing calls Discord in a test, so no MSW handler is needed in this slice ([development, tests locally](../technical/development.md#tests-locally)).
  - The seeded connections were last updated on 2026-01-01, so they show offline forever (R-PUB-7). The end-to-end assertions therefore never depend on how fast the job runs.
- **D15. Seed with Prisma 7.** Prisma 7 runs the seed only on request ("not auto-run by migrations in v7") and sets it in the config file with `migrations.seed` (Prisma's official agent skill, `packages/database/.agents/skills/prisma-cli/references/db-seed.md`). The command is `node prisma/seed.ts`, because type stripping replaces `tsx` (D2). The seed is idempotent with `upsert`, as that reference advises. It holds:
  - one server;
  - `bot_status` with 2 connections;
  - 2 `shard_status` rows.

  Configurations and images join the seed in slices 3 and 4 ([development, local setup](../technical/development.md#local-setup)).

- **D16. Shard formula: confirmed.** "shard_id = (guild_id >> 22) % num_shards" ([Discord, Sharding](https://docs.discord.com/developers/events/gateway#sharding)). This resolves the [verify at build] of architecture 6.3 and of contracts (missed departures). Task 10 writes the result back.

## File map

| Path                                                                                                                                     | Responsibility                                                    | Origin                      |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `.github/workflows/dependency-review.yml`                                                                                                | `allow-ghsas` entry                                               | edited                      |
| `.github/workflows/ci.yml`                                                                                                               | `DATABASE_URL` for `test`; PostgreSQL, migrate and seed for `e2e` | edited                      |
| `packages/database/prisma/schema.prisma`, `prisma/migrations/<ts>_bot_online/`                                                           | `Server`, `ShardStatus`, `BotStatus`, enum `ShardState`           | hand + `prisma migrate dev` |
| `packages/database/prisma/seed.ts`, `prisma7.config.ts`, `package.json`                                                                  | seed and `db:seed`                                                | Prisma seed reference       |
| `packages/domain/src/{status,servers,variables,errors,index}.ts`, `status.test.ts`, `servers.test.ts`                                    | shared rules and types                                            | hand, test first            |
| `apps/bot/src/env.ts`, `env.test.ts`                                                                                                     | D7 variables                                                      | edited, test first          |
| `apps/bot/src/logger.ts`                                                                                                                 | pino per process (D10)                                            | hand                        |
| `apps/bot/src/gateway/{index,gatewayManager}.ts`, `worker/{createWorker,types,worker}.ts`, `status-repository.ts`                        | shards, queue publish, shard and bot status                       | bigbot, edited              |
| `apps/bot/src/rest/{index,restManager,fastify}.ts`                                                                                       | REST proxy                                                        | bigbot, edited              |
| `apps/bot/src/bot/{index,bot,command-definitions,commands,register-commands}.ts`                                                         | consumer, client, command definitions, handler map, registration  | bigbot, edited              |
| `apps/bot/src/bot/events/{interactions/create,guilds,members,nodejs}.ts`                                                                 | handlers                                                          | bigbot `create.ts` + hand   |
| `apps/bot/src/bot/commands/{help,status}.ts`                                                                                             | handlers                                                          | hand                        |
| `apps/bot/src/bot/servers/{server-service,server-repository,server-service.test}.ts`                                                     | R-SRV-3 to R-SRV-5                                                | hand, test first            |
| `apps/bot/src/bot/status/{status-service,status-repository,status-service.test}.ts`                                                      | R-CMD-2                                                           | hand                        |
| `apps/bot/src/test/database.ts`                                                                                                          | shared fixtures: `aServer()`, `resetServers()`                    | hand                        |
| `apps/bot/{package.json,Dockerfile,.env.example}`; `src/{gateway,rest,bot,register-commands}.ts` (deleted)                               | scripts and `CMD` on the template paths                           | edited                      |
| `apps/dashboard/src/server/status/{status-service,status-repository}.ts`, `src/app/status/{page,auto-refresh}.tsx`, `e2e/status.spec.ts` | R-PUB-4 to R-PUB-9                                                | hand, e2e first             |
| `docs/technical/{contracts,data-model,development,architecture,ci-cd}.md`, `docs/adr/0003…`                                              | write-back (Task 10)                                              | edited                      |

## Tasks

After each task, `git status` must show nothing unexpected. Never commit a `.env`. Every check runs from the repository root unless it says otherwise. Database checks need `docker compose -f compose.dev.yaml up -d --wait`.

### Task 1 — Allow the Prisma config advisory in dependency review

Files: `.github/workflows/dependency-review.yml`.

1. Under the `Dependency Review` step, add:

   ```yaml
   # Owner decision: effect ReDoS (<= 3.22.0) via @prisma/config 7.10.1; ignored until Prisma upgrades it.
   with:
     allow-ghsas: GHSA-7589-6fvf-x4pw
   ```

   The option name is from the action's README: `allow-ghsas` "Contains a list of GitHub Advisory Database IDs that can be skipped" ([dependency-review-action](https://github.com/actions/dependency-review-action#configuration-options)). In `action.yml` it is a "Comma-separated list of allowed GitHub Advisory IDs".

   The advisory is "Effect: ReDoS in Schema.TemplateLiteral compiled regex", on `effect` `<= 3.22.0` ([GitHub Advisory Database](https://github.com/advisories/GHSA-7589-6fvf-x4pw)). Check that the lockfile pulls it only through Prisma: `yarn why effect` lists `@prisma/config@7.10.1` as the only parent.

2. Check: `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest` reports no errors. Then, on the slice's pull request, the `dependency-review` check passes while `yarn.lock` changes.
3. Commit: `ci: allow prisma config advisory in dependency review`.

### Task 2 — Tables, migration and seed

TDD exception: this task is schema only. Its check is the migration and the seed.

Files: `packages/database/prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`, `prisma7.config.ts`, `package.json`, `turbo.json`.

1. Append to `schema.prisma` (data-model.md, `@map` to snake_case, `timestamptz`):

   ```prisma
   enum ShardState {
     online
     connecting
     offline

     @@map("shard_state")
   }

   model Server {
     id          String   @id
     name        String
     memberCount Int      @map("member_count")
     icon        String?
     botJoinedAt DateTime @map("bot_joined_at") @db.Timestamptz

     @@map("server")
   }

   model ShardStatus {
     shardId     Int        @id @map("shard_id")
     state       ShardState
     latencyMs   Int?       @map("latency_ms")
     serverCount Int        @map("server_count")
     updatedAt   DateTime   @map("updated_at") @db.Timestamptz

     @@map("shard_status")
   }

   model BotStatus {
     id         Int      @id @default(1)
     startedAt  DateTime @map("started_at") @db.Timestamptz
     shardCount Int      @map("shard_count")

     @@map("bot_status")
   }
   ```

2. Migrate: `yarn db:migrate -- --name bot_online`. Check: the new migration creates the 3 tables and the enum. `yarn turbo run db:generate` succeeds.
3. In `prisma7.config.ts`, add `seed: "node prisma/seed.ts"` under `migrations` (D15). In `package.json`, add `"db:seed": "prisma db seed"`. In `turbo.json`, set `"db:seed": { "cache": false, "dependsOn": ["db:generate"] }`. The seed imports the generated client, which is gitignored. Prisma says "In Prisma 7, `migrate dev` no longer runs `prisma generate` automatically" ([Prisma, Turborepo v7](https://www.prisma.io/docs/guides/v7/deployment/turborepo)). So a clean runner, or a fresh `yarn db:migrate` locally, has no client until `db:generate` runs. The guide's own tasks show no `db:seed`, so its `dependsOn` follows the guide's pattern for `build` and `dev`.
4. Write `prisma/seed.ts`. It imports `prisma` from `../src/client.ts` and upserts:
   - server `81384788765712384`, "Welcomer test server", 42 members, no icon, joined `2026-01-01T00:00:00Z`;
   - `bot_status` with id 1, started `2026-01-01T00:00:00Z`, `shardCount` 2;
   - `shard_status` 0: `online`, 40 ms, 1 server, updated `2026-01-01T00:00:00Z`;
   - `shard_status` 1: `online`, 60 ms, 0 servers, updated `2026-01-01T00:00:00Z`.

   End the script with `prisma.$disconnect()`, as the reference shows.

5. Check: `yarn db:seed` exits 0 twice in a row, which proves it is idempotent. This is also the first run of D2 item 2: if the generated client fails under type stripping, apply D2's fallback here.
6. Commit: `feat(database): add server, shard status and bot status tables with seed`.

### Task 3 — Shared status and server rules (test first)

Files: `packages/domain/{package.json,src/*}`.

1. Add Vitest to the domain package:

   ```sh
   yarn workspace @repo/domain add -D vitest vite
   ```

   Add the script `"test": "vitest run"`.

2. Write the tests first.

   `src/status.test.ts`, with `now = new Date("2026-11-20T12:00:00Z")` and a shared builder `aShard(overrides)`:
   - `R-PUB-7: a connection silent for exactly 1 minute is still shown with its state`
   - `R-PUB-7: a connection silent for more than 1 minute is shown offline` (60 001 ms, state `online`, then `connecting`)
   - `R-PUB-5: every connection online is Operational`
   - `R-PUB-5: one connection offline or connecting is Partial outage` (the Gherkin example: 4 connections, connection 2 silent for 2 minutes)
   - `R-PUB-5: no connection online is Major outage` (also with an empty list)
   - `R-PUB-8: finds the connection of a server with Discord's formula`: `shardOf("81384788765712384", 16)` is 2 and `shardOf("81384788765712384", 1)` is 0
   - `R-PUB-8: accepts an identifier of 17 to 20 digits only`: 16 and 21 digits are refused, letters are refused, and surrounding spaces are trimmed
   - `R-CMD-2: response time is the average of the online connections`: online 40 and 60 plus offline 500 gives 50; no online connection gives `null`

   `src/servers.test.ts`:
   - `R-PUB-6: counts each server once after READY and its GUILD_CREATE`
   - `R-PUB-6: an unavailable server stays counted; a removed one does not`

   Run `yarn test --filter=@repo/domain`. Expected: FAIL, because the modules are missing.

3. Write the code: plain functions and types, nothing infrastructural. The dependency rule lint of slice 0 enforces that.
   - `status.ts`: `type ShardState = "online" | "connecting" | "offline"`, `ShardStatus`, `SILENCE_LIMIT_MS = 60_000`, `effectiveState(shard, now)`, `overallState(shards, now)` returning `"operational" | "partial-outage" | "major-outage"`, `shardOf(serverId, shardCount)` using `BigInt`, `parseServerId(input)` with `/^\d{17,20}$/` that throws `InvalidServerId`, and `averageLatency(shards, now)`.
   - `servers.ts`: `Server` (`id`, `name`, `memberCount`, `icon`), and `countServers(ids: Set<string>, event)` for the events `ready`, `create` and `delete` with `unavailable` (D5).
   - `variables.ts`: `VARIABLES`, the 11 names of [messages, variables](../business/messages.md#variables) with their "Replaced by" text. Slice 3 adds the maximum lengths to the same list. A constant needs no test of its own.
   - `errors.ts`: `InvalidServerId` and `ServerNotFound`, both extending `Error` ([architecture 8](../technical/architecture.md#8-crosscutting-concepts), domain errors).
   - `index.ts`: re-exports these modules.
4. Run `yarn test --filter=@repo/domain`. Expected: PASS. `yarn lint` and `yarn typecheck` exit 0.
5. Commit: `feat(domain): add status, server count and variables rules`.

### Task 4 — Bot app from the bigbot template

TDD exception: template copy. Only the environment change gets a test first.

Files: `apps/bot/**`.

1. Copy the template at commit `a6a17cc`. Only `src/` is taken, without the files of D3. The template's `package.json`, `compose.yaml`, `Dockerfile` and `rabbitmq/` stay out: Welcomer already has its own.

   ```sh
   tmp="$(mktemp -d)" && git clone --depth 1 https://github.com/discordeno/discordeno "$tmp/dd"
   (cd "$tmp/dd" && git log -1 --format=%H)   # record the commit in the PR
   rsync -a "$tmp/dd/examples/bigbot/src/" apps/bot/src/
   rm apps/bot/src/{config,util}.ts apps/bot/src/rest/influx.ts apps/bot/src/gateway/fastify.ts apps/bot/src/bot/fastify.ts apps/bot/src/bot/commands/ping.ts apps/bot/src/bot/utils/{loader,updateCommands,webhook}.ts
   git rm apps/bot/src/{gateway,rest,bot,register-commands}.ts
   ```

   Check: `git status` lists only the template files and the four deleted slice-0 entry points. Commit the copy as it is, with no edits, so the review sees what the template gave: `chore(bot): copy discordeno bigbot template sources`.

2. Install the dependencies. The bot also gets the workspace packages:

   ```sh
   yarn workspace bot add -E @discordeno/bot@22.0.0-beta.2
   yarn workspace bot add amqplib@2.4.0 fastify@5.12.8 @fastify/multipart@10.1.9 pino@10.4.0 @repo/domain@workspace:* @repo/database@workspace:*
   ```

3. Change the environment, test first. In `env.test.ts`:
   - the gateway's complete object gains `REST_PROXY_URL` and `REST_PROXY_SECRET`;
   - the bot's complete object gains `DISCORD_TOKEN` (D7) and `DASHBOARD_URL` (D13);
   - the gateway's `required` becomes `REST_PROXY_URL`.

   Run `yarn test --filter=bot -- src/env.test.ts`. Expected: FAIL. Add the fields to `gatewayEnv` and `botEnv` in `env.ts`, with `DASHBOARD_URL: z.url()`. Expected: PASS. In `apps/bot/.env.example`:
   - set `DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.x.y` and `DISCORD_CLIENT_ID=123456789012345678` (D7);
   - add `DASHBOARD_URL=http://localhost:3000/dashboard`.

   Add `DASHBOARD_URL` to `turbo.json` `globalEnv`.

4. Adapt the template, with the smallest edit for each point:
   - Imports `.js` become `.ts` (D2).
   - `config.ts` values become the parsed env: each `index.ts` starts with `const env = <process>Env.parse(process.env)`. Intents: `Intents.Guilds | Intents.GuildMembers` ([contracts](../technical/contracts.md#discord-application)). `SHARDS_PER_WORKER = 16` and `TOTAL_WORKERS = 4` are constants in `gatewayManager.ts`, and `TOTAL_SHARDS` is left unset (contracts: the recommended shard count).
   - `promiseWithResolvers()` becomes `Promise.withResolvers()`, and `getDirnameFromFileUrl(import.meta.url)` becomes `import.meta.dirname`.
   - Gateway: drop the HTTP server, `sendPayload`, `editBotStatus` and the `ShardInfo` messages (D3). The REST manager uses the proxy with `REST_PROXY_URL` and `REST_PROXY_SECRET` (D7). The worker path is `worker.ts`. The worker's message handler types its payload as `DiscordGatewayPayload` (snake_case). The template's `Camelize<DiscordGatewayPayload>` contradicts the template's own change "docs(bigbot): Send snake_case packets to bot" (`beta.2` release notes) **[verify at build: the shard passes snake_case payloads to `events.message`]**.
   - Rest: `listen({ host: "0.0.0.0", port: 8000 })` (D8). The `authorization` check uses `REST_PROXY_SECRET`. `createRestManager({ token: env.DISCORD_TOKEN, applicationId: env.DISCORD_CLIENT_ID })`.
   - Bot: drop the HTTP server and `overrideGatewayImplementations`. `createBot` with `token`, `intents` and `rest.proxy` from env. Set the `desiredProperties` needed by Tasks 6 and 8: guild `id`, `name`, `icon`, `memberCount`; member `guildId`; interaction `id`, `type`, `data`, `token`, `guildId`. discordeno v22 keeps no cache (R-PRV-6) **[verify at build: `member.guildId` is filled with this setting]**.
   - `src/logger.ts`: `export const createLogger = (service: string, level: string) => pino({ level, base: { service } })`. It replaces the template's `createLogger` calls in our files (D10).
   - Scripts and image. In `package.json`:
     - `dev:gateway`: `node --watch --env-file-if-exists=.env src/gateway/index.ts`
     - `dev:rest`: `node --watch --env-file-if-exists=.env src/rest/index.ts`
     - `dev:bot`: `node --watch --env-file-if-exists=.env src/bot/index.ts`
     - `register-commands`: `node --env-file-if-exists=.env src/bot/register-commands.ts`

     The Dockerfile `CMD` becomes `["node", "apps/bot/src/bot/index.ts"]`. The bot now imports the Prisma client, which is gitignored and generated. So the `builder` stage runs `RUN yarn turbo run db:generate --filter=@repo/database` after `COPY --from=prepare /app/out/full/ .`. The filter names the database package, because Turborepo runs a task only in the packages that match the filter, and `bot` has no `db:generate` script. The dashboard image already generates the client through `build`'s `^db:generate`.

5. Check D2. Each check is **[verify at build]**:
   - `yarn typecheck` and `yarn lint` exit 0. Fix the template code where strict lint fails, never the rules (slice 0, Task 4).
   - `cp apps/bot/.env.example apps/bot/.env && node --env-file=apps/bot/.env apps/bot/src/rest/index.ts` prints that the proxy listens on 8000. Stop it with Ctrl+C. The `dev:rest` script uses `--watch`, so it never exits on its own.
   - `node --env-file=apps/bot/.env apps/bot/src/bot/index.ts` connects to the local RabbitMQ and waits. This needs the database migrated, and it proves that `@repo/database` and `@repo/domain` load through the symlinks.
   - The gateway cannot start without a real token. Its worker file is loaded in Task 7's check.
6. Run `yarn format:write`: the template uses its own Biome style, and Prettier rewrites it. Check that `yarn format` exits 0.
7. Commit: `feat(bot): adapt bigbot template to welcomer layout and environment`.

### Task 5 — Event queue as the contract says

TDD exception: the queue settings are library behaviour. The check is the local stack.

Files: `apps/bot/src/gateway/worker/worker.ts`, `apps/bot/src/bot/index.ts`.

1. Gateway worker. Replace the deduplication exchange with the following (D4):

   ```ts
   await channel.assertQueue(QUEUE, { durable: true });
   ```

   Publish with:

   ```ts
   channel.sendToQueue(QUEUE, Buffer.from(body), {
     persistent: true,
     contentType: "application/json",
   });
   ```

   `QUEUE = "gateway-events"` and the connection URL is `RABBITMQ_URL`, in place of the template's username, password and host.

   `handleShardMessageEvent` counts servers first (Task 7). Then it returns without publishing unless `payload.t` is one of the contract's events: `READY`, `GUILD_CREATE`, `GUILD_UPDATE`, `GUILD_DELETE`, `GUILD_MEMBER_ADD`, `GUILD_MEMBER_REMOVE` or `INTERACTION_CREATE` ([contracts](../technical/contracts.md#gateway-to-bot-event-queue)). Heartbeat acks and other dispatches never reach the queue.

2. Bot consumer. Use the same `assertQueue`, then `channel.prefetch(100)`, then `channel.consume(QUEUE, handler, { noAck: false })`. The handler calls the template's `handleGatewayEvent` in a `try`. On error it logs at level error, without the payload (R-PRV-4), then acks either way. "a failed handling is logged and not retried" ([contracts](../technical/contracts.md#gateway-to-bot-event-queue)).
3. Check: with the compose stack up, publish one test message with the RabbitMQ management UI (`http://localhost:15672`, guest/guest). The bot logs it and the queue's "Unacked" count returns to 0. Stop the bot, publish again, and restart the bot: the message is handled. That is the ADR-0003 consequence.
4. Commit: `feat(bot): use a durable work queue between gateway and bot`.

### Task 6 — Servers recorded and removed (test first)

Files: `apps/bot/src/bot/servers/*`, `apps/bot/src/bot/events/{guilds,members}.ts`, `apps/bot/src/test/database.ts`, `.github/workflows/ci.yml`.

1. In `ci.yml`, give the `test` job `env: { DATABASE_URL: postgresql://welcomer:welcomer@localhost:5432/welcomer }`. `DATABASE_URL` is already in `turbo.json` `globalEnv`, so Turborepo passes it through. Locally, run the tests against `welcomer_test` (D14).
2. Write the shared fixtures in `src/test/database.ts`:
   - `aServer(overrides)` builds a domain `Server`.
   - `resetServers()` runs `prisma.server.deleteMany()`.

   The service under test is `createServerService(prismaServerRepository, clock)`, with a fixed clock.

3. Write the tests first in `server-service.test.ts`, against the real database. Each test calls `beforeEach(resetServers)`. The rules depend on upsert semantics and on SQL ([test strategy](../technical/test-strategy.md#levels)). Snowflakes for 2 connections, each checked with `(id >> 22) % 2`: `222078108977594368`, `222078108985982976` and `222078108994371584` are on connection 0, and `222078108981788672` is on connection 1.
   - `R-SRV-3: records a server the bot joins`: the row has name, member count, icon and the clock's join date.
   - `R-SRV-3: a known server is updated, never reset`: joined at T1, then joined again at T2 with a new name and count. The name and count change; the join date stays T1.
   - `R-SRV-4: an arrival adds one member and a departure removes one`: 10, then 11, then 10.
   - `R-SRV-5: leaving deletes the server; an unavailable server is kept`
   - `R-SRV-5: after READY, deletes the servers of that connection missing from it`: there are 4 servers:
     - A, on connection 0, missing from the list;
     - B, on connection 0, listed;
     - C, on connection 1, missing;
     - D, on connection 0, missing, but joined after the clock reading of READY (D6).

     Only A is deleted.

   R-SRV-6 (statistics found again) has no test in this slice: there are no statistics tables yet. Slice 5 adds the case.
   Run `yarn test --filter=bot -- src/bot/servers/server-service.test.ts`. Expected: FAIL.

4. Write the service and its port:

   ```ts
   export interface ServerRepository {
     upsert(server: Server, joinedAt: Date): Promise<void>;
     update(id: string, changes: Pick<Server, "name" | "icon">): Promise<void>;
     addMembers(id: string, delta: 1 | -1): Promise<void>;
     remove(id: string): Promise<void>;
     removeMissing(
       shard: { id: number; count: number },
       presentIds: string[],
       joinedBefore: Date,
     ): Promise<void>;
   }
   ```

   `createServerService(repository, clock)` has these methods:
   - `joined(server)` upserts with `clock()`.
   - `updated` calls `update`.
   - `memberArrived` and `memberLeft` call `addMembers` with ±1.
   - `left(id, unavailable)` does nothing when the server is unavailable (R-SRV-5).
   - `shardReady(shard, ids)` reads `clock()` before any `await`, then calls `removeMissing`. A one-line comment says why: the dispatch path from the consumer is synchronous (D6).

5. Write `prismaServerRepository` (`server-repository.ts`):
   - `upsert` uses `prisma.server.upsert`; its `update` part refreshes `botJoinedAt` from Discord's `joined_at` and leaves `recordedAt` out (R-SRV-3).
   - `update` and `addMembers` use `updateMany` with `{ increment: delta }`, so a server not yet stored changes nothing, and nothing throws.
   - `remove` uses `deleteMany`.
   - `removeMissing` uses `$executeRaw` with D6's SQL and `NOT ("id" = ANY(${presentIds}))` **[verify at build: Prisma binds a string array as `text[]`]**.

   Rows are mapped to domain types in this file only.

6. Run the test again. Expected: PASS.
7. Wire the handlers, mapping discordeno bigints to strings here:
   - `events/guilds.ts`: `bot.events.guildCreate`, `guildUpdate`, `guildDelete` (`{ id, unavailable }`, from `handleGuildDelete` at `beta.2`) and `ready` (`{ shardId, guilds, shard }`).
   - `events/members.ts`: `guildMemberAdd` and `guildMemberRemove`. Only the server identifier is used; the member's name and identifier are never read or kept (R-PRV-6).

   `bot/index.ts` builds the service with `prismaServerRepository` and `() => new Date()`. It also removes the template's `await bot.events.dispatchRequirements?.(…)` line from `handleGatewayEvent` (D6).

8. Check: `yarn lint`, `yarn typecheck` and `yarn test` exit 0.
9. Commit: `feat(bot): record servers on join and remove them on leave`.

### Task 7 — Shard and bot status from the gateway

TDD exception: the counting rule is tested in Task 3. The rest is wiring to discordeno and Prisma.

Files: `apps/bot/src/gateway/{index,gatewayManager,status-repository}.ts`, `worker/{types,worker,createWorker}.ts`.

1. Worker:
   - Keep one `Set<string>` per shard and call `countServers` on `READY`, `GUILD_CREATE` and `GUILD_DELETE` before publishing (D5). Pending shards in resharding count, without publishing.
   - Every 30 seconds, post `{ type: "ShardStatuses", statuses }` to the manager. Each status holds `shardId`, the state, `latencyMs` from `shard.heart.rtt` (or `null`) and `serverCount`.
   - State mapping from `ShardState`: `Connected` becomes `online`. `Connecting`, `Unidentified`, `Identifying` and `Resuming` become `connecting`. `Disconnected` and `Offline` become `offline`. This follows the enum's own doc comments in `packages/gateway/src/types.ts`.
2. `status-repository.ts`, the Prisma adapter of the gateway:
   - `start(startedAt, shardCount)` upserts `bot_status` id 1 and deletes the `shard_status` rows with `shardId >= shardCount`, in one `$transaction` ([data model, shard_status](../technical/data-model.md#shard_status)).
   - `setShardCount(n)` does the same without touching `startedAt`.
   - `save(statuses, updatedAt)` upserts each row in one `$transaction`.
3. Manager:
   - After `createGatewayManager`, call `start(new Date(), gatewayManager.totalShards)`.
   - In the template's `onReshardingSwitch`, call `setShardCount(gatewayManager.totalShards)`.
   - On each worker `ShardStatuses` message, call `save(statuses, new Date())`. On error, log at level error.
4. Check: `yarn lint` and `yarn typecheck` exit 0. Then run `node --env-file=apps/bot/.env apps/bot/src/gateway/worker/worker.ts`. It must fail on the missing `parentPort` assertion, not on a type-stripping error, which proves D2 item 3 **[verify at build]**. The live run is the owner's check in Task 12.
5. Commit: `feat(bot): write shard and bot status from the gateway`.

### Task 8 — `/help`, `/status` and command registration

R-CMD-1 is the fixed text of [commands](../business/commands.md), so it has no automated test; the owner checks it in Task 12. R-CMD-2's `connected` derivation gets one test first, with a fake port.

Files: `apps/bot/src/bot/{command-definitions,commands,register-commands}.ts`, `commands/{help,status}.ts`, `status/{status-service,status-repository,status-service.test}.ts`, `events/interactions/create.ts`.

1. Split the command definitions from their handlers (D3):
   - `command-definitions.ts` exports `commandDefinitions`, an array of `CreateApplicationCommand` objects: `name`, `description`, `contexts: [DiscordInteractionContextType.Guild]`. It imports only types from `@discordeno/bot`. `contexts: [0]` makes each command server only ([contracts](../technical/contracts.md#discord-application)).
   - `commands.ts` maps each name to its `run` handler (`help`, `status`). These are the template's `Command` fields minus `devOnly`.
2. `events/interactions/create.ts` keeps the template's lookup, with these changes:
   - It first calls `await interaction.defer(true)`, a deferred ephemeral response, because Discord needs "an initial response within 3 seconds" ([contracts](../technical/contracts.md#bot-and-dashboard-to-discord-rest-proxy)).
   - Then it calls `run`, which ends with `interaction.edit(…)` **[verify at build: `edit` without a message id edits the original response at `beta.2`]**.
   - On a thrown error, it edits the reply to "Something went wrong. Please try again later." and logs the error with `serverId` and the command name only (R-PRV-4).
3. `commands/help.ts` builds one embed with the R-CMD-1 table text verbatim:
   - the title "Welcomer help" as the embed title;
   - Setup, Variables (one `` `{{name}}` — what it shows `` line each, from `VARIABLES` of Task 3) and Links as fields;
   - `DASHBOARD_URL` (D13) and `SUPPORT_SERVER_URL`.

   The Variables field must stay within Discord's 1,024 characters per field value **[verify at build]**.

4. Write the test first in `status/status-service.test.ts`, with an in-memory `StatusRepository`, a fixed clock and a fixed runtime:
   - `R-CMD-2: connected only when the connection serving this server is online`: there are 2 connections. The server `81384788765712384` is on connection 0. Connection 0 is fresh and connection 1 silent, so the answer is connected. Connection 0 silent for 2 minutes gives not connected.

   Run `yarn test --filter=bot -- src/bot/status/status-service.test.ts`. Expected: FAIL. Write the service below. Expected: PASS.

   `status/status-service.ts` takes three ports: a `StatusRepository` (`shards()`, `botStatus()`), a clock, and a `Runtime` (`startedAt`, `memoryBytes()`). `get(serverId)` returns:
   - `connected`: `effectiveState` of the server's shard is `online`;
   - `averageLatencyMs`;
   - `runningSince` and `memoryBytes`;
   - `shardId = shardOf(serverId, shardCount)` (D9).

   `status-repository.ts` maps Prisma rows to domain `ShardStatus`. `commands/status.ts` formats the answer:
   - "Connected: yes/no"
   - "Response time: N ms"
   - "Running since <t:unix:R>"
   - "Memory: N MB"
   - "Discord connection: N"

5. `register-commands.ts` imports only `command-definitions.ts` and `registerCommandsEnv`. It builds `createRestManager({ token, applicationId })` and calls `upsertGlobalApplicationCommands(commandDefinitions)`. So registration loads no service, database or logger. That is the bulk overwrite `PUT /applications/<id>/commands` (contracts). Then it calls `process.exit()`, as the template does ("the REST Manager has timeouts").
6. Check: `yarn lint`, `yarn typecheck` and `yarn test` exit 0.
7. Commit: `feat(bot): add help and status commands and their registration`.

### Task 9 — Status page (e2e first)

Files: `apps/dashboard/{package.json,src/server/status/*,src/app/status/*,e2e/status.spec.ts}`, `.github/workflows/ci.yml`.

1. In `ci.yml`, give the `e2e` job the same `postgres` service as `test`. Its steps, after setup, are:

   ```yaml
   - run: cp packages/database/.env.example packages/database/.env
   - run: yarn turbo run db:deploy
   - run: yarn turbo run db:seed
   ```

   They run before the existing steps (D14).

2. Add the dependency `yarn workspace dashboard add @repo/domain@workspace:*`.
3. Write the test first, in `e2e/status.spec.ts`, against the seed of Task 2:
   - `R-PUB-4, R-PUB-6, R-PUB-7: shows the summary and one line per connection`:
     - the heading "Status";
     - "Major outage" (R-PUB-5, every connection silent);
     - total servers `1`;
     - `time[datetime="2026-01-01T00:00:00.000Z"]`;
     - 2 rows, each "offline", with 40 ms and 60 ms;
     - the last update time.
   - `R-PUB-8: shows which connection serves a server`: fill `81384788765712384`, submit, and see "Discord connection 0".
   - `R-PUB-8: a server without the bot shows not found`: `41771983423143937`.
   - `R-PUB-8: refuses an identifier that is not 17 to 20 digits`: `123`.
   - `R-PUB-9: refreshes every 30 seconds`: `page.clock.install()`, open the page, then `page.clock.fastForward("00:30")`, and expect a new request for `/status` **[verify at build: the Playwright clock drives `setInterval` in the page]**.

   Run `yarn e2e`. Expected: FAIL, because `/status` is 404.

4. `src/server/status/status-repository.ts` reads `shard_status` ordered by `shardId`, `bot_status` id 1, and `server` by id. It maps the rows to domain types. The service, `status-service.ts`, has two functions:
   - `getStatus(now)` returns `{ overall, totalServers, startedAt, shards: effective }`.
   - `findShard(input)` runs `parseServerId`, which throws `InvalidServerId`. If the server row is missing, it throws `ServerNotFound`. Otherwise it returns `shardOf(id, shardCount)`.

   Services throw domain errors. The page maps them to messages ([architecture 8](../technical/architecture.md#8-crosscutting-concepts)).

5. `src/app/status/page.tsx`. A static heading "Status", then `<Suspense>` around an async component:
   - It calls `await connection()`, then reads `getStatus(new Date())` and `searchParams.server` (D11).
   - It renders the summary (R-PUB-4) with the R-PUB-5 label: "Operational", "Partial outage" or "Major outage".
   - It renders a table (R-PUB-6) with the columns "Connection", "State", "Response time", "Servers", "Last update". Times are `<time dateTime>` in UTC.
   - The lookup is a `next/form` with input `server` and the button "Find". Its result reads "Discord connection N", "Server not found" or "Enter a server identifier of 17 to 20 digits".

   HeroUI components follow the HeroUI docs, through the `heroui-react` skill. The default theme stays (ADR-0010).

6. `src/app/status/auto-refresh.tsx` is `"use client"`. It runs `useEffect(() => { const id = setInterval(() => router.refresh(), 30_000); return () => clearInterval(id); }, [router])` and renders nothing (R-PUB-9).
7. Run `yarn e2e`. Expected: PASS. `yarn build` still exits 0 without a database (D11).
8. Commit: `feat(dashboard): add public status page`.

### Task 10 — Write the results back into the docs

Do this after Tasks 1 to 9 and the owner's live check in Task 12, so that every result is known. Remove each **[verify at build]** marker once its result is written, with its source.

- `development.md`:
  - environment table: gateway gains `REST_PROXY_URL` and `REST_PROXY_SECRET`; bot gains `DISCORD_TOKEN` (D7) and `DASHBOARD_URL` (D13), a new row;
  - tests locally: the `welcomer_test` database for database tests, and how to create and migrate it (D14);
  - Tools: the versions of this plan;
  - local setup step 4: what the seed holds now;
  - `yarn dev` order: rest must answer before the gateway starts. If the gateway exits at start, `node --watch` waits for a file change **[verify at build]**.
- `contracts.md`:
  - queue name `gateway-events` and the work-queue settings (D4);
  - the guard on the missed-departure cleanup (D6), with its marker removed (D16);
  - rest listens on `0.0.0.0:8000` (D8);
  - the gateway reaches Discord through the proxy (D7).
- `ci-cd.md`:
  - the `e2e` job runs with a PostgreSQL service, `db:deploy` and `db:seed`, and the `test` job sets `DATABASE_URL` (D14);
  - the dependency-review exception `allow-ghsas: GHSA-7589-6fvf-x4pw`, with its reason (Task 1);
  - Versions: the discordeno `beta` pin as the documented exception to "latest stable" (D1).
- `data-model.md`: the `server_count` set rule (D5) and the `bot_status.id` column (D12).
- `architecture.md` 6.3: the shard formula, confirmed (D16).
- `docs/adr/0003…` "More Information": the template commit and the discordeno tag (D1), replacing "re-check at build".
- [slice 0](./0-foundation.md) "Not verified": the D7 symlink item and the discordeno item are now resolved; point them here.

Check: `yarn format` exits 0. Commit: `docs: record slice 1 verification results`.

### Task 11 — Pull request

1. Push `feat/bot-online` and open the pull request `feat: bot online (slice 1)`. Fill the template with the rule IDs of the scope.
2. Check: every required check is green, `dependency-review` included (Task 1). After the merge, CI on `main` is green, and `images.yml` pushes both images tagged with the SHA.
3. Then the independent review of the slice, against these documents.

### Task 12 — Live check (owner, real Discord credentials)

CI cannot run these steps. They need the owner's development application ([development, local setup](../technical/development.md#local-setup) step 1).

1. Fill `apps/bot/.env` and `apps/dashboard/.env`. Run `docker compose -f compose.dev.yaml up -d --wait`, `yarn db:migrate` and `yarn db:seed`.
2. Run `yarn workspace bot register-commands`. In the test server, `/help` and `/status` appear, and only in servers, not in direct messages.
3. Run `yarn dev`. Within 30 seconds:
   - The gateway logs that its shards are identified.
   - `/status` (the page at `http://localhost:3000/status`) shows "Operational", every connection online with a response time, and the real server count.
   - Row 0 of the seed is updated. Row 1 is removed if the application has 1 shard.
4. `/help` answers only to the member who typed it, with the R-CMD-1 sections and both links. `/status` answers only to that member with "Connected: yes", a response time, the running time, the memory, and the connection number. That number must match the page's lookup for the test server's identifier.
5. R-SRV-3 and R-SRV-4: the test server's row exists with its name, icon and member count. A second account joins: the count goes up by 1. It leaves: the count goes down by 1.
6. R-SRV-5 and R-SRV-6:
   - Kick the bot: the row is deleted.
   - Invite it again: the row is back, with a new join date.
   - Stop the gateway, kick the bot, then start the gateway: after `READY`, the row is deleted (missed departure).
7. R-SRV-2: the invitation link of [contracts](../technical/contracts.md#invitation-link) asks Discord only for view channels, send messages, embed links and attach files.
8. ADR-0003: stop `bot`, make the second account join, then start `bot`. The count is still updated, because the event waited in the queue.
9. R-PUB-7: stop the gateway. After 1 minute and a refresh within 30 seconds, every connection shows offline and the page shows "Major outage".
10. R-PRV-4: `docker compose logs` and the terminal output hold no member name and no message content.

Report each result in the pull request, and write the [verify at build] results in Task 10.

## Build results

Built on branch `feat/slice-1-bot-online` (the coordinator's name for this slice's branch, in place of `feat/bot-online`). Template commit: `a6a17cc66601089ac3ed8599055b49a597d127d6`.

[verify at build] items:

- D1: the template type-checks against `@discordeno/bot` `22.0.0-beta.2`; no fallback to the `next` pin.
- D2.1: `node` loads `@repo/database` and `@repo/domain` through the `node_modules` symlinks (the bot starts and waits on the queue).
- D2.2: the Prisma-generated client loads under type stripping (`yarn db:seed` runs `node prisma/seed.ts` twice, exit 0); no `tsx` fallback.
- D2.3: `new Worker(".../worker.ts")` runs under type stripping; run directly, `worker.ts` stops on the `parentPort` assertion.
- Task 4: the shard passes the raw snake_case packet: `events.message?: (shard, payload: DiscordGatewayPayload)` and `this.events.message?.(this, packet)` (`@discordeno/gateway` 22.0.0-beta.2, `dist/types.d.ts` and `dist/Shard.js`).
- Task 4: `member.guildId` is filled when `desiredProperties.member.guildId` is set and the handler passes it (`transformers/member.js`; `GUILD_MEMBER_ADD` passes `guildId`). Its type stays optional, so the handler guards it.
- Task 6: Prisma binds a JavaScript string array as `text[]` in `$executeRaw`: the R-SRV-5 READY test passes against PostgreSQL.
- Task 8: `interaction.edit` without a message id, after `defer`, calls `editOriginalInteractionResponse` (`transformers/interaction.js`).
- Task 8: the `/help` Variables field is 738 characters, under the 1,024 limit the plan cites (Discord's embed limits page was not re-fetched).
- Task 9: the Playwright clock drives the page's `setInterval`: the R-PUB-9 test passes in the 3 browsers and fails when `<AutoRefresh />` is removed.
- D11: `yarn build` with an unreachable `DATABASE_URL` succeeds; `/status` is a partial prerender.
- D16: the four test snowflakes match `(id >> 22) % 2` as the plan lists.

Fixes and deviations, each at its root:

- Task 1 not applied: editing `allow-ghsas` was refused by the agent's permission check. The `dependency-review` check passed on the pull request without it, so it is dropped (KISS).
- Task 2: `packages/database/tsconfig.json` includes `prisma`, so typed lint finds `prisma/seed.ts` (the lint error names this fix: "Consider either including it in the tsconfig.json").
- Task 4: each process parses its environment in the template module that first needs it (`gatewayManager.ts`, `restManager.ts`, `bot.ts`), not in `index.ts`: ES modules evaluate imports first, and those modules build their clients at load time.
- Task 4: `apps/bot/tsconfig.json` sets `lib` and `target` to `es2024`, for `Promise.withResolvers` (TypeScript: ES2024 library). Node 26 runs ES2024.
- Task 4: the template's option-parsing types and autocomplete are dropped: no slice-1 command has options, and with Welcomer's `desiredProperties` they resolve to empty types that strict lint refuses. Slice 3 adds what `/test` needs.
- Task 4: `rest/index.ts` keeps `req.raw.aborted` with a line-level lint exception. Fastify's guide says "`destroyed` is not a suitable replacement" and keeps `aborted`; Node marks it deprecated. The framework guide wins (CLAUDE.md).
- Task 4: the checks run with `--env-file=apps/bot/.env.example`, not by copying it over `.env`, which holds the owner's real values.
- Task 5: the template reconnected on both `error` and `close`, and amqplib emits `close` after `error` (`lib/connection.js`, `closeWithError` and `onSocketError` then `toClosed`), so each failure doubled the reconnect loops. Both sides now reconnect on `close` only. The check used RabbitMQ's management HTTP API in place of the UI.
- Task 6: the READY test's server D joins at a time after the READY clock (T3), not at the same instant, to match "joined after".
- Task 9: `shardOf` uses `BigInt(22)`, not `22n`: the dashboard keeps create-next-app's `ES2017` target, which refuses BigInt literals.
- Task 9: the page uses plain HTML elements; no HeroUI component was needed in this slice.

Review fixes on the pull request:

- Dashboard `lint` runs `next typegen` first: without `.next`, the generated `PageProps` type is missing and typed lint reports 20 `no-unsafe-*` errors. Next.js: "Types are generated during `next dev`, `next build` or `next typegen`" (`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`). `typecheck` already did the same.
- The bot acknowledges a message only after its handlers settle. discordeno calls each event without awaiting it, so each registered event hands its promise to `track()`, and the consumer awaits `Promise.allSettled` before `ack` (`bot/dispatch.ts`, with a test). Dispatch stays synchronous, so D6's clock reading is unchanged. A failed handler is logged with `shardId`, `serverId` and the event name.
- RabbitMQ: a failure in `createChannel`, `assertQueue`, `prefetch` or `consume`, or a channel `close`, closes the connection, and its `close` handler reconnects. Checked locally: with a conflicting queue declared, the bot retries once per second, then consumes again once the conflict is gone.
- The dashboard status service takes its repository as a port (`createStatusService(repository)`), wired once in `src/server/status/index.ts`.
- Accepted: the bot and the dashboard each map `shard_status` rows in their own repository, one adapter per app, since the apps share no infrastructure code.
- Accepted: the gateway writes status through its repository without a service; recorded in development.md, Architecture rules.
- `/status` before the gateway ever ran: the repository returns `null`, and the reply says "Discord connection: not connected yet". Outside a server, the command replies "Use /status in a server." instead of throwing.
- REST proxy: the `preParsing` hook sends the 401 before it returns (Fastify Hooks: "`reply.send()` must be called before the function returns"), and the secret is compared with `crypto.timingSafeEqual` after a length check, since it throws on different lengths.
- Accepted: the REST proxy answers 500 on any Discord error, as the template does; the template documents no status passthrough.
- `READY` without the shard pair skips the missed-departure cleanup, since no server can be matched to the connection.
- `server.bot_joined_at` now holds Discord's `joined_at` from `GUILD_CREATE` (R-ADM-3, "date the bot joined"). The new `recorded_at` column holds when the bot first stored the row, and D6's guard uses it. The review said the docs already asked for `joined_at`; they did not, so contracts.md and data-model.md now say it. The slice's migration was regenerated, since it is not on `main` yet.
- Local end-to-end tests run on `welcomer_test` freshly seeded (development.md).
- Template comments that repeat the code are removed.
- CodeQL raised a high alert, `js/missing-rate-limiting`, on the REST proxy's authorization hook. Fix: `@fastify/rate-limit` 11.2.2, Fastify's official plugin, which CodeQL recognises (`FastifyRateLimiter` in `MissingRateLimiting.qll`). It keeps the plugin's defaults, with an `allowList` that exempts requests carrying the secret, so only unauthenticated requests are limited and the bot's own traffic is never throttled. The plugin's hook is route-level, and "route-level hooks are always executed as the last hook in their category" (Fastify, Hooks). So the secret check moved from `onRequest` to `preParsing`: after the limiter, before the body is parsed. It is awaited before routes are added, as the plugin README does. Checked locally: 1,000 requests with a wrong secret get 401, the next gets 429, and the right secret still gets 200.

Still open: Task 12 (owner live check), and the `yarn dev` start order between rest and gateway.

## Done when

- [ ] Every rule of slice 1 is implemented, with tests written first that name the rule. They fail without their code (definition of done 1):
  - R-SRV-3, R-SRV-4 and R-SRV-5 in `server-service.test.ts`;
  - R-PUB-5, R-PUB-6, R-PUB-7, R-PUB-8 and R-CMD-2 (average) in `packages/domain`;
  - R-CMD-2 (connected) in `status-service.test.ts`;
  - R-PUB-4 to R-PUB-9 in `e2e/status.spec.ts`.
    R-SRV-2 and R-CMD-1 (fixed texts) are checked by hand (Task 12). R-SRV-6 needs statistics and gets its test in slice 5. No test covers discordeno, Prisma or RabbitMQ.
- [ ] Gateway, rest and bot are joined by one durable queue, as the contract says. `/help` and `/status` answer ephemerally. `register-commands` does one bulk overwrite. The status page is public and refreshes every 30 seconds (roadmap, slice 1).
- [ ] The quality gate passes on `main` without Discord credentials, and both images are on GHCR, tagged with the commit SHA (definition of done 2).
- [ ] The code follows the architecture rules and conventions (definition of done 3):
  - The domain has no infrastructure import.
  - Handlers call one service; services call ports; repositories map Prisma and discordeno types.
  - The lookup throws typed domain errors.
  - Logs never hold a member name or message content.
- [ ] An independent review of the slice against these documents found nothing left to fix (definition of done 4).
- [ ] Every slice-1 **[verify at build]** item is checked and written back (Task 10, definition of done 5).
- [ ] The owner's live check (Task 12) passed.

## Owner decisions needed

None. The documents answer every point, and their default is applied. D9's reading of "connected or not" is the only interpretation, and it rests on R-PUB-7.

## Not verified

- That the bigbot template type-checks against `22.0.0-beta.2`, a version newer than its own pin (D1).
- Node type stripping on:
  - the Prisma-generated client;
  - workspace packages reached through `node_modules` symlinks;
  - worker-thread files (D2).

  No Prisma or Node page covers the generated client under strip-only mode. A search found nothing either way.

- discordeno `beta.2`:
  - `interaction.edit` without a message id;
  - `desiredProperties` filling `member.guildId`.
- The shard passing snake_case payloads to the worker's `events.message` (Task 4).
- Prisma binding a JavaScript string array to `text[]` in `$executeRaw` (D6).
- The Playwright clock driving the page's `setInterval` (Task 9).
- Whether the `/help` Variables field fits Discord's per-field limit. Discord's embed limits page was not fetched in this plan.
- The local `yarn dev` start order between rest and gateway.
- The Next.js guides bundled in `node_modules/next/dist/docs/`: this plan read the online pages only, and Task 9 re-reads the bundled ones. The worktree had no `node_modules`.
- Whether discordeno's internal logger can emit JSON. It keeps its default (D10).
