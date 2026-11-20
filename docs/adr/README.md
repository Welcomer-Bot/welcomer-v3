# Architecture decision records

Format: [MADR 4](https://adr.github.io/madr/). One decision per file.

| ADR                                                   | Decision                                                                  | Status   |
| ----------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| [0001](./0001-record-decisions-with-madr.md)          | Record architecture decisions with MADR                                   | accepted |
| [0002](./0002-monorepo-yarn-turborepo.md)             | One monorepo with Yarn workspaces and Turborepo                           | accepted |
| [0003](./0003-discordeno-three-processes-rabbitmq.md) | discordeno with gateway, rest and bot processes joined by RabbitMQ        | accepted |
| [0004](./0004-nextjs-dashboard-behind-nginx.md)       | Next.js dashboard, one instance behind nginx                              | accepted |
| [0005](./0005-supabase-postgres-with-prisma.md)       | PostgreSQL on Supabase, accessed through Prisma                           | accepted |
| [0006](./0006-better-auth-discord-sign-in.md)         | Better Auth with Discord, default sessions, placeholder email             | accepted |
| [0007](./0007-compose-deploy-per-unit.md)             | Docker Compose on one server, one deploy per unit                         | accepted |
| [0008](./0008-statistics-events-and-daily-totals.md)  | Statistics as partitioned events plus daily totals                        | accepted |
| [0009](./0009-shared-card-rendering.md)               | One image rendering package for bot and preview                           | accepted |
| [0010](./0010-heroui-default-theme.md)                | HeroUI v3 with its default theme for the dashboard                        | accepted |
| [0011](./0011-discord-message-preview.md)             | Discord message preview with Skyra components and discord-markdown-parser | proposed |
