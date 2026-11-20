---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# Statistics as partitioned events plus daily totals

## Context and Problem Statement

About 4 million events a day at 100,000 servers; events kept 7 days, daily totals forever, current day always up to date (R-STA-3, R-STA-4, R-STA-12).

## Considered Options

- Events partitioned by day + daily totals upserted in the same transaction
- Events only, totals computed on read
- Nightly aggregation job

## Decision Outcome

Chosen option: "Events partitioned by day + daily totals upserted in the same transaction". `stat_event` partitioned by UTC day, partitions dropped after 7 days; each event insert upserts its daily total in the same transaction.

### Consequences

- Good: cheap deletes; totals exact and current.
- Bad: partitioning SQL is hand-written in a migration, since Prisma cannot declare partitions.

## More Information

- [PostgreSQL, partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html): "Bulk loads and deletes can be accomplished by adding or removing partitions".
- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate): migration SQL is customizable. Re-check at build.
