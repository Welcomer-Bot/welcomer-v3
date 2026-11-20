---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# One image rendering package for bot and preview

## Context and Problem Statement

The preview must match the image the bot posts (R-EDT-2, R-IMG-*).

## Considered Options

- One `packages/card` used by the bot and by a dashboard server route
- Separate canvas code in the browser and in the bot

## Decision Outcome

Chosen option: "One `packages/card` used by the bot and by a dashboard server route". `packages/card` renders the image on the server side for both: the bot for Discord, the dashboard for the preview. The rendering library is `@napi-rs/canvas`: "Google Skia binding to Node.js via Node-API, 0 System dependencies" ([napi-rs/canvas](https://github.com/Brooooooklyn/canvas)). Fonts are files shipped in `packages/card`, from Google Fonts under the SIL Open Font License, registered with `GlobalFonts.registerFromPath`. Noto Sans, Noto Sans CJK and Noto Color Emoji are registered as fallbacks, for names in other scripts and emoji. The output is a PNG named `welcomer.png`, referred to as `attachment://welcomer.png` in the first embed (R-IMG-19).

### Consequences

- Good: one code path, identical result.
- Bad: the preview is a server round trip.

## More Information

- `@napi-rs/canvas` needs glibc 2.18 or later on the image's system (same source).
