---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# One monorepo with Yarn workspaces and Turborepo

## Context and Problem Statement

Bot and dashboard share rules (variables, limits, worst case, image rendering) and the database schema. Deploys must run only for the affected unit.

## Considered Options

- One monorepo, Yarn workspaces + Turborepo
- One monorepo, Yarn workspaces only
- Separate repositories with published packages

## Decision Outcome

Chosen option: "One monorepo, Yarn workspaces + Turborepo". One monorepo with Yarn workspaces, and Turborepo as task runner: it orders builds (database client generated before typecheck), caches tasks, and tells CI which apps are affected (`--affected`) for per-unit deploys.

### Consequences

- Good: a rule change is one pull request; affected-only CI and deploys.
- Bad: one more tool to learn.

## More Information

- [Turborepo, constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci): `turbo run build --affected`.
- [Turborepo, Docker](https://turborepo.dev/docs/guides/tools/docker): `turbo prune --docker`.
- [Yarn, workspaces](https://yarnpkg.com/features/workspaces).
