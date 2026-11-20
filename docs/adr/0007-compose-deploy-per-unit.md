---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# Docker Compose on one server, one deploy per unit

## Context and Problem Statement

Dashboard, bot and gateway must be delivered separately, each only after the quality gate.

## Considered Options

- Compose + GHCR images + one workflow per unit
- Kubernetes
- Kamal

## Decision Outcome

Chosen option: "Compose + GHCR images + one workflow per unit". One Compose file on the server. Images on GHCR tagged by commit SHA. Images are built by the CI on `main`. Deploy workflows (one per unit, each recreating only its services with `docker compose up -d --wait`) come later.

### Consequences

- Good: small, standard, fits one server; a bot deploy never touches the gateway.
- Bad: no automatic rollback; rollback is a manual redeploy of a previous SHA.

## More Information

- [Docker, compose up](https://docs.docker.com/reference/cli/docker/compose/up/).
- [GitHub, environments](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-environments-for-deployment).
