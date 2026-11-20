---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# Record architecture decisions with MADR

## Context and Problem Statement

Decisions must be traceable for the agents who build the product, each with its reason and sources.

## Considered Options

- MADR 4 files in `docs/adr/`
- Decisions inline in architecture.md only
- No record

## Decision Outcome

Chosen option: "MADR 4 files in `docs/adr/`". MADR 4 files in `docs/adr/`, one decision per file, numbered, linked from [architecture §9](../technical/architecture.md#9-architecture-decisions).

### Consequences

- Good: the standard template referenced by adr.github.io; one place per decision.
- Bad: one more file per decision.

## More Information

- [MADR](https://adr.github.io/madr/): release 4.0.0.
- [adr.github.io](https://adr.github.io/): an ADR captures "a justified design choice".
