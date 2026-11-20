# Test strategy

Few tests, on the business rules of [`../business/`](../business/). Tests cover only the code we write, never a library's own behaviour.

## Principles

- Tests are written before the code (test-driven development).
- Each rule gets its nominal case and the edge cases the rule itself defines (a limit, an empty or invalid input). No wider sweep.
- Each test names the rule it proves, for example `R-MSG-8: refuses a title over 256 characters in the worst case`.
- The Given / When / Then examples of the business documents are where these cases come from, not one test each.
- Arrange, act, assert, visibly separated; shared fixtures (data builders) for common setups.

## Levels

As the Next.js testing guides recommend: business logic first, Vitest for synchronous components, end-to-end for async Server Components, which Vitest does not support (Next.js, Vitest guide, in `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` once installed) **[verify at build]**.

| Level      | Tool                           | What                                                                                                                                                                                                               |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Business   | Vitest                         | rules in `packages/domain` and `packages/card`; services and repositories against a real PostgreSQL where a rule depends on the database (activation swap, limit of 5, optimistic locking, event plus daily total) |
| Component  | Vitest + React Testing Library | synchronous editor components that hold logic, with user-event and role queries                                                                                                                                    |
| End-to-end | Playwright                     | a few journeys through the pages: sign in (stubbed), edit and validate, statistics                                                                                                                                 |

## Not tested

- Discord, Prisma, Better Auth, discordeno, HeroUI: covered upstream. Discord REST is mocked with MSW; sign-in is stubbed in end-to-end tests ([development](./development.md#tests-locally)).
- The rendered pixels of an image: only its layout decisions (sizes, cut text, fallback background).

## In CI

The `test` and `e2e` jobs of the [quality gate](./ci-cd.md#ci-workflow-the-quality-gate) run them; a failing test blocks the merge and every deploy.
