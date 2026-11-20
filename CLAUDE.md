# Welcomer v3

Discord bot that posts welcome and goodbye messages, with a Next.js dashboard. Monorepo: Yarn workspaces and Turborepo.

## The documents are the specification

- Start from [docs/README.md](docs/README.md). Before working on a slice, read its rules and technical docs listed in [docs/roadmap.md](docs/roadmap.md).
- Business docs (`docs/business/`) use domain words only: no code, table, file, library or framework names. Technical docs cite the rule (R-…) they implement.
- A change of behaviour updates its rule and technical doc in the same pull request. A **[verify at build]** item, once checked, is written back into the docs.
- One roadmap slice at a time; each slice has a plan in `docs/plans/` written before its code, and an independent review at the end.

## Commands

Run from the repository root (created in slice 0):

- `yarn dev` — gateway, rest, bot and dashboard; needs `docker compose -f compose.dev.yaml up -d` and each app's `.env`
- `yarn lint`, `yarn format`, `yarn typecheck`, `yarn test`, `yarn e2e`, `yarn build` — the quality gate; run them before committing
- `yarn test --filter=<workspace> -- <path>` — one test file, path relative to that workspace
- `yarn db:migrate`, `yarn db:seed` — local database

Tests that touch the database need `DATABASE_URL` and the dev Compose stack.

## How to decide

- Official recommendations first: check the current official docs of the tool (for Next.js, `node_modules/next/dist/docs/`), else the widely established pattern. Cite the source (URL and a short quote) in plans, reports and reviews, and say what could not be verified. Requests from the owner are checked the same way; flag one that goes against a source.
- Standards, but KISS: the simplest standard option. A framework default stays the default. No speculative risk, procedure, optimisation or test.
- Write the least code: the tools' official generators first, then refactor duplication away.
- A bug is fixed at its root: read all the code involved, then make one global fix. Never a patch on a configuration or a workaround. Nothing exotic.
- No new dependency outside the documented stack without a reason in the pull request; a structural choice gets an ADR in `docs/adr/` (MADR 4).

## Code

- Architecture rules are strict: [docs/technical/development.md, Architecture rules](docs/technical/development.md#architecture-rules) (dependency rule, ports and adapters, layers, separate types, typed domain errors).
- Conventions: [docs/technical/development.md, Conventions](docs/technical/development.md#conventions).
- Tests first (TDD). Few tests: each rule's nominal case and the edge cases the rule defines, named after the rule; arrange, act, assert; shared fixtures. Never test a library's own behaviour. Details: [docs/technical/test-strategy.md](docs/technical/test-strategy.md).
- Comments only when the code cannot say why.
- Never commit a secret: the repository is public; only `.env.example` files are committed.

## Writing

- All documents in English.
- Commits and pull request titles follow Conventional Commits; no `Co-Authored-By` trailer.
