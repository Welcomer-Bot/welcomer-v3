---
status: accepted
date: 2026-11-20
decision-makers: owner
---

# HeroUI v3 with its default theme for the dashboard

## Context and Problem Statement

Dev agents must not choose a look, a component set or a theme on their own. The owner wants the most standard option and no custom design ([requirements, non-functional needs](../requirements.md#non-functional-needs)).

## Considered Options

- HeroUI v3 with its package defaults
- A custom design system

## Decision Outcome

Chosen option: "HeroUI v3 with its package defaults". The dashboard uses `@heroui/react` and `@heroui/styles` on Tailwind CSS v4, installed and set up as the HeroUI guide says, with the default theme and no custom tokens. Accessibility is what HeroUI (built on React Aria) and the Next.js ESLint rules give by default.

### Consequences

- Good: no design work; accessible components by default.
- Bad: the dashboard looks like other HeroUI apps.

## More Information

- [HeroUI, React docs](https://heroui.com/docs/react/getting-started). Its quick start was followed in slice 0: `@heroui/styles` and `@heroui/react` 3.2.7, `@import "@heroui/styles"` right after `@import "tailwindcss"` ("Import order matters. Always import `tailwindcss` first"), no provider ("does not require a Provider"), and no custom tokens. Not verified: Yarn reports `@internationalized/date` and `@react-aria/ssr` as peers of `@heroui/react` that the dashboard does not list; the quick start does not mention them.
