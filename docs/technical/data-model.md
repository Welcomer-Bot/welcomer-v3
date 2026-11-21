# Data model

Physical model of the [domain model](../business/domain-model.md). Database: PostgreSQL on Supabase, schema owned by `packages/database` (Prisma). No other package declares tables ([ADR-0005](../adr/0005-supabase-postgres-with-prisma.md)). Names below are logical; Prisma model names are PascalCase, columns camelCase mapped to snake_case with `@map`.

## Tables

### server

| Column        | Type           | Notes                                                                                |
| ------------- | -------------- | ------------------------------------------------------------------------------------ |
| id            | text, PK       | Discord guild identifier (snowflake)                                                 |
| name          | text           | kept up to date on guild update                                                      |
| member_count  | integer        | R-SRV-4                                                                              |
| icon          | text, nullable | Discord icon hash, kept up to date on guild create and update; shown on server pages |
| bot_joined_at | timestamptz    | R-ADM-3; Discord's `joined_at` from guild create                                     |
| recorded_at   | timestamptz    | when the bot first stored the row; guards the missed-departure cleanup (contracts)   |

Row created on guild create, deleted on guild delete when the guild is not merely unavailable (R-SRV-5). Deleting it cascades to `configuration`, `active_configuration`, `image`. Statistics have no foreign key to it (R-SRV-6).

### configuration

| Column       | Type                                     | Notes                                                                                                        |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| id           | uuid, PK                                 |                                                                                                              |
| server_id    | text, FK server, on delete cascade       |                                                                                                              |
| message_type | enum `welcome`, `goodbye`                | R-CFG-1                                                                                                      |
| name         | varchar(50)                              | unique with (server_id, message_type) — R-CFG-7                                                              |
| channel_id   | text                                     | Discord channel identifier; not a foreign key (R-CFG-16)                                                     |
| message      | jsonb                                    | text and embeds, validated by `packages/domain` on every write and read                                      |
| image_id     | uuid, FK image, nullable                 | R-IMG-3: deleting an image clears `image_id` and `image_place` of its configurations in the same transaction |
| image_place  | enum `attached`, `first_embed`, nullable | required when image_id is set — R-IMG-19                                                                     |
| version      | integer, default 1                       | optimistic locking — R-EDT-9                                                                                 |
| created_at   | timestamptz                              | library order — R-CFG-11                                                                                     |
| updated_at   | timestamptz                              |                                                                                                              |

### active_configuration

| Column           | Type                                              | Notes                              |
| ---------------- | ------------------------------------------------- | ---------------------------------- |
| server_id        | text, FK server, on delete cascade                | PK with message_type               |
| message_type     | enum                                              |                                    |
| configuration_id | uuid, FK configuration, unique, on delete cascade | the one active — R-CFG-2, R-CFG-13 |

One row per (server, type) makes "at most one active" a primary key rule. Activating another configuration replaces `configuration_id` in one statement; deleting the active configuration removes the row (R-CFG-15). Chosen over a partial unique index, which Prisma offers only behind a preview feature ([Prisma, indexes](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)) **[verify at build]**.

### image

| Column              | Type                               | Notes                                                                                                |
| ------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| id                  | uuid, PK                           |                                                                                                      |
| server_id           | text, FK server, on delete cascade |                                                                                                      |
| name                | varchar(50)                        | unique with server_id — R-IMG-2                                                                      |
| layout              | enum `left`, `center`, `right`     | R-IMG-7                                                                                              |
| avatar_border_color | char(7)                            | `#RRGGBB` — R-IMG-8                                                                                  |
| background_color    | char(7), nullable                  | at most one of color or url; both empty means the default background — R-IMG-15                      |
| background_url      | text, nullable                     | link only, never the picture — R-IMG-15                                                              |
| texts               | jsonb                              | member name, title, subtitle with their style, validated by `packages/domain` — R-IMG-10 to R-IMG-14 |
| version             | integer, default 1                 | R-EDT-9                                                                                              |
| created_at          | timestamptz                        |                                                                                                      |
| updated_at          | timestamptz                        |                                                                                                      |

### stat_event

| Column                   | Type                                | Notes                                                                                                                                                                                                                   |
| ------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                       | bigint, generated                   | PK with `occurred_at`: a key on a partitioned table must include the partition key ([PostgreSQL, partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE-LIMITATIONS)) |
| server_id                | text                                | no foreign key                                                                                                                                                                                                          |
| kind                     | enum `arrival`, `departure`, `send` | R-STA-2                                                                                                                                                                                                                 |
| message_type             | enum, nullable                      | set for `send`                                                                                                                                                                                                          |
| configuration_id         | uuid, nullable, no foreign key      | set for `send`; survives deletion — R-STA-17                                                                                                                                                                            |
| messages, embeds, images | smallint                            | set for `send` — R-STA-5 to R-STA-7                                                                                                                                                                                     |
| occurred_at              | timestamptz                         | partition key                                                                                                                                                                                                           |

Partitioned by range on `occurred_at`, one partition per UTC day. A job creates the partitions of the next days and drops partitions older than 7 days (R-STA-3), see [scheduled jobs](#scheduled-jobs); dropping a partition is the bulk delete PostgreSQL recommends ([PostgreSQL, partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)). Prisma cannot declare partitions: the partitioning SQL lives in a hand-edited migration ([ADR-0008](../adr/0008-statistics-events-and-daily-totals.md)).

### daily_server_total

| Column     | Type    | Notes                               |
| ---------- | ------- | ----------------------------------- |
| day        | date    | UTC — R-STA-10; PK (server_id, day) |
| server_id  | text    | no foreign key                      |
| arrivals   | integer |                                     |
| departures | integer |                                     |

### daily_send_total

| Column                   | Type    | Notes                                               |
| ------------------------ | ------- | --------------------------------------------------- |
| day                      | date    | PK (server_id, day, message_type, configuration_id) |
| server_id                | text    | no foreign key                                      |
| message_type             | enum    |                                                     |
| configuration_id         | uuid    | no foreign key — R-STA-17                           |
| messages, embeds, images | integer |                                                     |

Every read is one server over a range of days, so keys start with `server_id`. `stat_event` has an index on (`server_id`, `occurred_at`).

Each event insert and the matching daily total upsert (`insert … on conflict do update set x = x + …`) run in one transaction, so the current day is always up to date (R-STA-12). Days without a row show 0 (R-STA-11).

### shard_status

| Column       | Type                                   | Notes                                                                                                                                                                              |
| ------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shard_id     | integer, PK                            |                                                                                                                                                                                    |
| state        | enum `online`, `connecting`, `offline` |                                                                                                                                                                                    |
| latency_ms   | integer, nullable                      |                                                                                                                                                                                    |
| server_count | integer                                | counted by the gateway as a set of server identifiers per connection: `READY` replaces it, guild create adds, guild delete removes unless the server is only unavailable (R-PUB-6) |
| updated_at   | timestamptz                            | older than 1 minute shows offline — R-PUB-7                                                                                                                                        |

At start the gateway deletes the rows with `shard_id` at or above the new shard count. Plus one row of `bot_status` (`id` integer primary key, always 1, since Prisma needs a unique field on each model; `started_at`, `shard_count`) for R-PUB-4 and the shard formula.

### Authentication tables

`user`, `session`, `account`, `verification`: generated by the Better Auth CLI, not written by hand ([ADR-0006](../adr/0006-better-auth-discord-sign-in.md)). `user.email` holds a placeholder `<discord id>@discord.placeholder.invalid`, never a real address (R-PRV-2). `session` keeps the network address and device by default (R-PRV-1). A daily job deletes expired sessions, then users without any session (R-PRV-3): Better Auth documents no automatic deletion of expired sessions ([Better Auth, session management](https://www.better-auth.com/docs/concepts/session-management)).

### Admins

Not a table: a list of Discord identifiers in the dashboard's environment (`ADMIN_DISCORD_IDS`), kept by the team outside the product (R-ADM-2).

## Constraints Prisma cannot declare

Added by hand in a migration created with `prisma migrate dev --create-only` ([Prisma, customizing migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations)):

- `image`: at most one of `background_color` and `background_url` (R-IMG-15).
- `configuration`: `image_place` is set exactly when `image_id` is set (R-IMG-19).
- `stat_event`: partitioning ([ADR-0008](../adr/0008-statistics-events-and-daily-totals.md)).

## Scheduled jobs

Run by the bot process: once at start, then every hour. The scheduler exists from slice 2 with the `sessions` job only; slice 5's `partitions` job, which is idempotent, shares it (slice 2, D14). A failure is logged at level error.

| Job        | Does                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| partitions | creates the `stat_event` partitions of today and the next 2 days; drops those older than 7 whole UTC days before today. No default partition |
| sessions   | deletes expired sessions, then users without any session (R-PRV-3)                                                                           |

## Connections

Prisma 7 uses driver adapters; with `pg`, the pool size is the adapter's `max`, 10 by default ([Prisma, connection pool](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool#prisma-orm-v7-driver-adapter-defaults)). Gateway, bot and dashboard keep that default; the migration container uses one connection. Their sum must stay under the Supabase pooler's limit, which belongs to database operations (out of scope).

## Volume estimate

Assumption: 20 arrivals or departures per server per day, 100,000 servers, about one send per arrival or departure. About 4 million events a day, 46 writes per second on average, about 28 million rows over 7 days. Daily totals: at most 100,000 server rows and a few hundred thousand send rows per day. Estimate to confirm with a load test **[verify at build]**.

## Migrations

Prisma Migrate, `migrate deploy` run as its own step before the services are recreated ([Prisma, development and production](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)). The running version keeps working while a migration applies: expand first, contract in a later release ([Martin Fowler, Parallel Change](https://martinfowler.com/bliki/ParallelChange.html)).
