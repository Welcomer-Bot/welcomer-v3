# Roadmap

The product is built in vertical slices: each slice delivers working behaviour end to end (rules, data, interface, tests, images), on top of a walking skeleton ([Alistair Cockburn, walking skeleton](https://wiki.c2.com/?WalkingSkeleton)). Slices are done in order; a slice starts when the one before it is done.

## Definition of done

A slice is done when:

1. Every rule it lists is implemented, with tests written first that name the rule ([test strategy](./technical/test-strategy.md)).
2. The quality gate passes on `main` and both images are pushed ([CI](./technical/ci-cd.md)).
3. The code follows the [architecture rules](./technical/development.md#architecture-rules) and [conventions](./technical/development.md#conventions).
4. An independent review of the slice against these documents found nothing left to fix.
5. The items of the slice marked **[verify at build]** are checked, and the documents updated with the result.

## Slices

| #   | Slice                        | Delivers                                                                                                     | Rules and documents |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------- |
| 0   | Foundation                   | monorepo from the official generators (`create-turbo`, `create-next-app`, HeroUI install, `prisma init`, Better Auth CLI); empty apps and packages of [architecture 5.2](./technical/architecture.md#52-repository-layout); local setup; quality gate and image workflow green | [development](./technical/development.md), [CI](./technical/ci-cd.md), ADR-0001 to ADR-0007, ADR-0010 |
| 1   | Bot online                   | gateway, rest and bot joined by the queue; servers recorded and removed; `/help`, `/status`; commands registration; status page | R-SRV-2 to R-SRV-6, R-CMD-1, R-CMD-2, R-PUB-4 to R-PUB-9, [contracts](./technical/contracts.md) |
| 2   | Sign-in and servers          | Discord sign-in, sessions, rights, server list, invitation, server pages shell with tabs                     | R-ACC-1 to R-ACC-12, R-SRV-1, R-PRV-1 to R-PRV-3 |
| 3   | Configurations and messages  | spike of the message preview first (ADR-0011); configuration library, editor, preview, worst-case check, activation, sending on arrival and departure, `/test` | R-CFG-*, R-MSG-*, R-VAR-*, R-EDT-*, R-CMD-3 to R-CMD-5, R-PRV-4 to R-PRV-6 |
| 4   | Custom images                | image library, image editor and preview, rendering in the bot, placement in the message                     | R-IMG-*, ADR-0009 |
| 5   | Statistics                   | events and daily totals, scheduled jobs, statistics page                                                     | R-STA-*, ADR-0008, [data model](./technical/data-model.md#scheduled-jobs) |
| 6   | Back-office and landing      | admin access, server list and search, landing page                                                           | R-ADM-*, R-PUB-1, R-PUB-11 |

Each slice gets its own step-by-step plan, written before its code. Rules not listed in a slice are covered where they apply (for example R-PRV-7 to R-PRV-11).

## Later

What comes after these slices is in [requirements, later](./requirements.md#later): deploying to the server, monitoring, legal pages and the product features listed there.
