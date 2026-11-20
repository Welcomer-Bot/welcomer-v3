---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# discordeno with gateway, rest and bot processes joined by RabbitMQ

## Context and Problem Statement

The bot must never be interrupted for more than a few seconds, updates included, at 100,000 servers.

## Considered Options

- discordeno, three processes, RabbitMQ between gateway and bot
- One process holding shards and logic
- discord.js with its sharding manager

## Decision Outcome

Chosen option: "discordeno, three processes, RabbitMQ between gateway and bot". discordeno split into gateway (shards), rest (REST proxy, rate limits) and bot (logic). The gateway publishes events to RabbitMQ; the bot consumes them, so a bot restart loses no event and does not reconnect shards.

### Consequences

- Good: bot deploys in seconds without reconnecting to Discord; one place for rate limits.
- Bad: three processes and a queue to run; the gateway itself is redeployed rarely and by hand.

## More Information

- [discordeno, architecture](https://discordeno.js.org/docs/architecture): "three main components/processes: Gateway, Bot, and Rest".
- [discordeno, Big Bot step 3](https://discordeno.js.org/docs/bigbot/step-3-gateway): restarting the bot without a queue can lose events.
- Sources read 2026-11-19 for the earlier attempt; re-check at build.
