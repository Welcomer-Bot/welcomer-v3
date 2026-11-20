---
status: proposed
date: 2026-11-20
decision-makers: owner
---

# Discord message preview with Skyra components and discord-markdown-parser

## Context and Problem Statement

The editor shows a live preview of the message as Discord shows it (R-EDT-1, R-EDT-2): text, embeds with fields, mentions, custom emoji and Discord markdown. The owner does not want the Discord look or the markdown parser written by hand.

## Considered Options

- `@skyra/discord-components-react` to render, with `discord-markdown-parser` to parse
- `discord-markdown` or `@odiffey/discord-markdown` (HTML string output)
- `@discord-message-components/react`
- Hand-written components and parser

## Decision Outcome

Chosen option: "`@skyra/discord-components-react` with `discord-markdown-parser`". The parser turns each text into a syntax tree; one small mapper turns the tree into Skyra components. That mapper is the only custom code. The preview is a client component.

### Consequences

- Good: both packages are maintained (Skyra repository active in November 2026, MIT; parser released December 2025, Apache 2.0); the parser follows Discord's own approach: "based on the simple-markdown library, which is the same technology discord use" ([discord-markdown-parser](https://github.com/ItzDerock/discord-markdown-parser)).
- Good: an established pairing; `discord-html-transcripts` builds on the same two.
- Bad: Skyra components are client only: "bundled with the `'use client';` header" ([Skyra, known limitations](https://github.com/skyra-project/discord-components#known-limitations)).
- Bad: the parser has no list rule; add `SimpleMarkdown.defaultRules.list` as its README shows. Masked links need its `extended` mode. Skyra has no strikethrough component; use `<s>`.

### Rejected

- `discord-markdown` (last release 2021) and its fork output HTML strings, which need `dangerouslySetInnerHTML`.
- `@discord-message-components/react`: React 17 only, last release 2021.

## More Information

Not verified in this session, to check in a spike before the editor slice **[verify at build]**: the Skyra components on React 19 and the current Next.js; masked links; how the Skyra theme sits next to HeroUI.
