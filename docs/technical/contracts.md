# Contracts between parts

What each part of Welcomer exchanges with the others and with Discord. A change to a contract changes both sides in one pull request (monorepo, [ADR-0002](../adr/0002-monorepo-yarn-turborepo.md)).

## Database: who writes what

| Table                                            | Written by              | Read by                                  |
| ------------------------------------------------ | ----------------------- | ---------------------------------------- |
| server                                           | bot                     | dashboard                                |
| configuration, active_configuration, image       | dashboard               | bot                                      |
| stat_event, daily_server_total, daily_send_total | bot                     | dashboard                                |
| shard_status, bot_status                         | gateway                 | dashboard (status page), bot (`/status`) |
| user, session, account, verification             | dashboard (Better Auth) | dashboard                                |

The bot never writes configurations; the dashboard never writes statistics (R-STA-1). The shapes of `configuration.message` and `image.texts` are defined once, as schemas in `packages/domain`, and checked on every write and read.

## Gateway to bot: event queue

- Transport: RabbitMQ ([discordeno, Big Bot](https://discordeno.js.org/docs/bigbot/step-3-gateway)). No deduplication and no maximum delay: an event is handled whenever the bot consumes it.
- Queue: `gateway-events`, one durable queue of the default classic type, persistent messages, manual acknowledgements, prefetch 100. Quorum queues are for "a replicated, highly available queue", which one RabbitMQ node cannot give ([RabbitMQ, quorum queues](https://www.rabbitmq.com/docs/quorum-queues#overview)); "Values in the 100 through 300 range usually offer optimal throughput" ([RabbitMQ, prefetch](https://www.rabbitmq.com/docs/confirms#channel-qos-prefetch-throughput)).
- Both sides run `assertQueue("gateway-events", { durable: true })`; the gateway publishes with `sendToQueue` and `{ persistent: true, contentType: "application/json" }`, the bot sets `prefetch(100)` and consumes with `noAck: false` ([RabbitMQ, work queues](https://www.rabbitmq.com/tutorials/tutorial-two-javascript)). Only the events listed below are published. Each side reconnects on the connection's `close` event only, since amqplib emits `close` after `error`.
- Payload: the Discord gateway event as the shard receives it, in snake_case (`{ shardId, payload }`).
- Shards: at start, the gateway uses the `shards` value of `GET /gateway/bot`, the "Recommended number of shards to use when connecting" ([Discord, Get Gateway Bot](https://docs.discord.com/developers/topics/gateway#get-gateway-bot)), and records it in `bot_status.shard_count`.
- Events used: `READY`, `GUILD_CREATE`, `GUILD_UPDATE`, `GUILD_DELETE`, `GUILD_MEMBER_ADD`, `GUILD_MEMBER_REMOVE`, `INTERACTION_CREATE`.
- The bot acknowledges a message after handling it; a failed handling is logged and not retried (R-CFG-3). If the bot stops before acknowledging, RabbitMQ delivers the event again, so a message may rarely be posted and counted twice; this is accepted ([RabbitMQ, automatic requeueing](https://www.rabbitmq.com/docs/confirms#automatic-requeueing): "consumers must be prepared to handle redeliveries").
- After each connection, Discord sends `GUILD_CREATE` for every server, first listed as unavailable in `READY` ([Discord, Guild Create](https://docs.discord.com/developers/events/gateway-events#guild-create)). The bot upserts the server and never resets it: a known server keeps its configurations (R-SRV-3). Name, member count and join date are taken from that event (`name`, `member_count`, `joined_at`, "When this guild was joined at"); the row also keeps when the bot first stored it (`recorded_at`).
- Missed departures of the bot: `READY` lists the guilds of its shard, "filtered to that shard" ([Discord, Ready](https://docs.discord.com/developers/events/gateway-events#ready)). After a shard's `READY`, the bot deletes the `server` rows that belong to that shard by the shard formula, are absent from the list, and were first stored before the bot read its clock on that `READY` (`recorded_at`) (R-SRV-5). The guard keeps a server whose `GUILD_CREATE` is stored while the `READY` before it is still being handled (prefetch 100). The dispatch from the consumer to the service is synchronous, so a later `GUILD_CREATE` always reads a later clock. Residual risk, accepted: a kick and a re-invite handled in the same instant may run out of order. The shard formula is confirmed (slice 1, D16).

## Data the bot uses to post

- No discordeno cache: the bot keeps nothing in memory between events (R-PRV-6).
- Member: from the event payload (`user`, and `member.nick` on arrival). Avatar: the global avatar, `https://cdn.discordapp.com/avatars/<user id>/<hash>.png?size=256`, static even when the hash starts with `a_`; without an avatar, `https://cdn.discordapp.com/embed/avatars/<index>.png` with index `(user_id >> 22) % 6` ([Discord, image formatting](https://docs.discord.com/developers/reference#image-formatting)).
- Server name and member count: from the `server` row, kept up to date by guild events, plus one and minus one on each arrival and departure.
- Channel name: read through the REST proxy only when the message uses `{{channel.name}}`.
- `/test`: the bot checks that the member has Manage Server or Administrator in the interaction's `member.permissions`, since a server can change who may use a command ([Discord, application command permissions](https://docs.discord.com/developers/interactions/application-commands#using-default-permissions)).
- Bot replies to an unexpected failure in a command: the deferred reply is edited to a generic error text, and the error is logged.

## Background images

The bot, the dashboard link test (R-IMG-17) and the preview fetch links given by managers, so each fetch follows OWASP's SSRF guidance ([OWASP, SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)):

- scheme `http` or `https` only;
- resolve the name, refuse if any address is private, loopback, link-local, unique-local, multicast or otherwise not public (the cheat sheet's table), and connect to the address checked;
- no redirects: "Disable the support for the following of the redirection";
- stop reading past 8 MB; accept only `image/png`, `image/jpeg`, `image/webp`, checked on the first bytes too;
- 3 seconds in total (R-IMG-18); user agent `WelcomerBot (+https://welcomer.app)`.

No cache of backgrounds: each image downloads its background again. shortcut: no cache, add one if downloads cost too much.

## Discord application

| Setting                    | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public bot                 | on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Requires OAuth2 code grant | off                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Install context            | server install only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Gateway intents            | `GUILDS` and `GUILD_MEMBERS` (privileged, already approved for the application) ([Discord, gateway intents](https://docs.discord.com/developers/events/gateway#gateway-intents))                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Commands                   | registered with one bulk overwrite by the `register-commands` command of the bot app, run by hand until deploying is automated, `PUT /applications/<id>/commands` ([Discord, bulk overwrite](https://docs.discord.com/developers/interactions/application-commands#bulk-overwrite-global-application-commands)); global; `contexts: [0]` (server only); `/test` has `default_member_permissions: "32"` (Manage Server) and a required option `type` with the choices welcome and goodbye ([Discord, application commands](https://docs.discord.com/developers/interactions/application-commands#application-command-object-application-command-structure)) |

## Bot and dashboard to Discord: REST proxy

- The `rest` service is the only caller of the Discord REST API with the bot token, so rate limits are shared ([discordeno, architecture](https://discordeno.js.org/docs/architecture)). The gateway calls `GET /gateway/bot` through it too. Exception: `register-commands`, run by hand, calls Discord directly.
- `rest` listens on `0.0.0.0:8000` ("When deploying to a Docker… it is advisable to listen on `0.0.0.0`", [Fastify, server](https://fastify.dev/docs/latest/Reference/Server/)); the port is part of this contract, not a deployment setting.
- Internal HTTP only, inside the Compose network, authenticated by a shared secret header.
- Calls by the bot: create message (with file when attached), with `allowed_mentions` set to `{ "users": [<member id>] }` and no `parse`, so only the member is notified (R-MSG-11; [Discord, allowed mentions](https://docs.discord.com/developers/resources/message#allowed-mentions-object): "the parse field is mutually exclusive with the other fields").
- Interaction replies: every command answers first with a deferred ephemeral response (type 5, flag 64), then edits it, since Discord needs "an initial response within 3 seconds" ([Discord, responding to an interaction](https://docs.discord.com/developers/interactions/receiving-and-responding#interaction-callback)); `/test` sends its image in that edit **[verify at build: attachments in an ephemeral edit are not documented]**.
- Calls by the dashboard: read the signed-in user as a member of the server, for the nickname in the preview (R-EDT-2); list a guild's channels, read the bot member and channel overwrites to warn about missing permissions (R-EDT-4). The bot's rights in a channel follow Discord's order: owner and Administrator have all rights; else base rights of @everyone and roles, then @everyone, role and member overwrites, each deny before allow ([Discord, permission overwrites](https://docs.discord.com/developers/topics/permissions#permission-overwrites)).

## Dashboard to Discord: user calls

- OAuth2 with scopes `identify` and `guilds` ([Discord, OAuth2 scopes](https://docs.discord.com/developers/topics/oauth2#shared-resources-oauth2-scopes)) **[verify at build]**.
- `GET /users/@me/guilds` with the user's token gives each guild's `owner` and `permissions`; the dashboard computes manager rights from them (R-ACC-5, R-ACC-6) and caches the result 60 seconds per user in the dashboard's memory (single instance) (R-ACC-7). The call returns at most 200 servers; when it returns 200, the dashboard asks again with `after` set to the last identifier ([Discord, Get Current User Guilds](https://docs.discord.com/developers/resources/user#get-current-user-guilds)).

## Invitation link

`https://discord.com/oauth2/authorize` with `client_id`, `scope=bot applications.commands`, `permissions=52224`, the sum of view channel 1024, send messages 2048, embed links 16384 and attach files 32768 (R-SRV-2; [Discord, permissions](https://docs.discord.com/developers/topics/permissions#permissions-bitwise-permission-flags)), `guild_id` of the chosen server and `disable_guild_select=true` from the dashboard, neither from the landing page; opened in a new tab (R-SRV-1) ([Discord, OAuth2 bot authorization](https://docs.discord.com/developers/topics/oauth2#bot-authorization-flow)).

## Health endpoints

| Service   | Check                                                                           | Used by             |
| --------- | ------------------------------------------------------------------------------- | ------------------- |
| dashboard | `GET /api/health`: 200 `{ "status": "ok" }` when the database answers, else 503 | Compose healthcheck |
| bot, rest | process-level healthcheck command in Compose                                    | Compose healthcheck |
| gateway   | `shard_status` rows fresher than 1 minute                                       | status page         |
