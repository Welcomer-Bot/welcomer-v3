# Operations

How Welcomer runs in production: server, logs, and what to do when something breaks. Deploying to the server comes later ([requirements, later](../requirements.md#later)); images come from the [CI](./ci-cd.md#image-workflow).

## Service level objectives

None for now: they need a measurement, and monitoring comes later ([requirements, later](../requirements.md#later)). Availability needs are in the [requirements](../requirements.md#non-functional-needs).

## Environments

| Environment | What                                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Local       | a development Discord application and test server; local PostgreSQL and RabbitMQ                                                          |
| Production  | the server, hosted in Germany; the database in a Supabase region of the European Union; GitHub environment `production` holds its secrets |

No staging: one server only (budget).

## Server

- Linux with Docker Engine and the Compose plugin. Services: nginx, dashboard, gateway, rabbitmq, bot, rest ([architecture §7](./architecture.md#7-deployment-view)).
- Each service: `restart: unless-stopped`, a memory limit, a healthcheck. Starting memory limits, to adjust after measuring:

  | Service   | Limit  |
  | --------- | ------ |
  | dashboard | 1 GB   |
  | bot       | 1.5 GB |
  | gateway   | 1 GB   |
  | rest      | 512 MB |
  | rabbitmq  | 512 MB |
  | nginx     | 128 MB |

  About 3.3 GB stay for the system and Docker.

- nginx: TLS certificates from Let's Encrypt issued and renewed by Certbot ([Certbot](https://certbot.eff.org/instructions)) **[verify at build]**; HTTP redirected to HTTPS; proxy to the dashboard with buffering off for streamed responses ([Next.js, self-hosting](https://nextjs.org/docs/app/guides/self-hosting)).
- RabbitMQ: a named volume for its data, so the durable queue survives a recreate; user and password from its `.env` (`RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`, [RabbitMQ image](https://hub.docker.com/_/rabbitmq)).
- Secrets: one `.env` per service on the server, readable by the deploy user only; copies in the GitHub `production` environment.

## Monitoring and alerts

- No uptime monitor for now ([requirements, later](../requirements.md#later)).
- The status page is the public view of the bot (R-PUB-4 to R-PUB-9).
- Compose healthchecks restart a stuck container.

## Logs

- Every service logs JSON lines to standard output ([12-factor, Logs](https://12factor.net/logs)).
- Docker sends them to the systemd journal with the `journald` driver ([Docker, journald](https://docs.docker.com/engine/logging/drivers/journald/)); `json-file` and `local` only rotate by size. The journal keeps 30 days (R-PRV-1) with `MaxRetentionSec=30day` in `journald.conf`, "The maximum time to store journal entries" ([journald.conf](https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html#MaxRetentionSec=)).
- Never logged: message content, member names, tokens (R-PRV-4).

## Database

Operating the database (Supabase plan, backups, restore, capacity) is out of scope of these documents. The product only connects to it and applies its migrations with `prisma migrate deploy` ([data model, migrations](./data-model.md#migrations)).

## Runbooks

### Bot not answering

1. Status page: are shards online? If not, see "Shards offline".
2. `docker compose ps`: bot and rest healthy? Read `docker compose logs bot --since 15m`.
3. RabbitMQ queue length growing: the bot is not consuming; restart `bot`.

### Shards offline

1. `docker compose logs gateway --since 15m`: authentication or rate limit errors?
2. Restart the gateway only if needed: every shard reconnects.

### Disk full

1. `docker system df`; prune old images: `docker image prune -a --filter until=168h`.
