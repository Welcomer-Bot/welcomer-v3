---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# PostgreSQL on Supabase, accessed through Prisma

## Context and Problem Statement

The database is hosted apart from the 8 GB server. Bot and dashboard share one schema.

## Considered Options

- Supabase PostgreSQL + Prisma, session pooler
- Supabase with its client library (PostgREST)
- Self-hosted PostgreSQL on the server

## Decision Outcome

Chosen option: "Supabase PostgreSQL + Prisma, session pooler". Supabase as plain PostgreSQL, accessed with Prisma from `packages/database`. Persistent servers connect through the session pooler (port 5432), which works over IPv4; migrations use the same URL.

### Consequences

- Good: managed database; one typed schema for both apps.
- Bad: none known for the product; operating the database is out of scope.

## More Information

- [Supabase, Prisma](https://supabase.com/docs/guides/database/prisma): session pooler for server-based deployments.
- [Supabase, connecting](https://supabase.com/docs/guides/database/connecting-to-postgres): "The shared pooler is IPv4-only on every plan".
