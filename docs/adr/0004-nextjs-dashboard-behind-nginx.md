---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# Next.js dashboard, one instance behind nginx

## Context and Problem Statement

The dashboard holds public pages, the manager dashboard and the back-office. A few seconds of downtime per update are accepted; a few minutes are not.

## Considered Options

- Next.js App Router, one instance, nginx in front
- Two instances with zero-downtime switch
- Another web framework

## Decision Outcome

Chosen option: "Next.js App Router, one instance, nginx in front". Next.js App Router in standalone output, one container, nginx as reverse proxy with TLS.

### Consequences

- Good: follows the Next.js self-hosting guide; simplest to run.
- Bad: a few seconds of downtime on each dashboard deploy (accepted by the owner).

## More Information

- [Next.js, self-hosting](https://nextjs.org/docs/app/guides/self-hosting): "it's recommended to use a reverse proxy (like nginx)"; disable buffering for streaming.
