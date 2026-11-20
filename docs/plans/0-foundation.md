# Slice 0 — Foundation: implementation plan

**Goal.** An empty Welcomer monorepo, built with the official generators, that runs locally and passes its quality gate: lint, format, typecheck, test, e2e, build. On `main`, both images go to GHCR. The architecture rules hold from the first commit.

**Scope** ([roadmap](../roadmap.md), slice 0). Covered here: [development](../technical/development.md), [CI](../technical/ci-cd.md), ADR-0001 to ADR-0007 and ADR-0010. Out of scope: deploy, monitoring, logs (pino), discordeno and RabbitMQ code, business rules.

**Architecture summary.** Yarn 4 workspaces with Turborepo ([ADR-0002](../adr/0002-monorepo-yarn-turborepo.md)), in the layout of [architecture 5.2](../technical/architecture.md#52-repository-layout):

- `apps/bot` has four entry points: `gateway`, `rest`, `bot` and `register-commands`. In slice 0, each one checks its environment and does nothing else. Node runs the TypeScript directly, with no build step.
- `apps/dashboard` holds Next.js, HeroUI and Better Auth. It uses standalone output.
- `packages/domain` and `packages/card` are empty, and lint forbids them from importing infrastructure.
- `packages/database` holds Prisma 7 and the Better Auth tables.
- `packages/config-eslint` and `packages/config-typescript` hold the shared settings.

The packages are Just-in-Time packages that export TypeScript source ([Turborepo, internal packages](https://turborepo.dev/docs/core-concepts/internal-packages): "compiled by the application that uses it").

**Method.** Each task does four things: run the generator, keep its output, refactor only for a documented reason, and commit. Tests come first wherever behaviour is ours (the environment checks and the e2e smoke test). Scaffold and configuration tasks are explicit TDD exceptions: their check is the command they ship.

## Tech stack (npm registry, 2026-11-20)

| Tool                                       | Version                                                                                                     | Note                                                                                                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js                                    | 26.13.1 (Active LTS "Lithium")                                                                              | `.nvmrc` `26`, `engines.node` `^26`                                                                                                                                                                                                                              |
| Corepack                                   | 0.36.0                                                                                                      | Node 25 and later no longer ship it. Install it with `npm install -g corepack` ([Yarn, install](https://yarnpkg.com/getting-started/install): "Install Corepack… `npm install -g corepack`")                                                                     |
| Yarn                                       | 4.18.1                                                                                                      | `packageManager` field set through `corepack use`                                                                                                                                                                                                                |
| create-turbo / turbo                       | 2.11.13                                                                                                     |                                                                                                                                                                                                                                                                  |
| create-next-app / next                     | 16.4.6                                                                                                      | React 19.3.1                                                                                                                                                                                                                                                     |
| TypeScript                                 | 5.9.3                                                                                                       | See decision D3                                                                                                                                                                                                                                                  |
| ESLint                                     | 9.39.5                                                                                                      | See decision D4                                                                                                                                                                                                                                                  |
| typescript-eslint                          | 8.73.0                                                                                                      | peer `typescript >=4.8.4 <6.1.0`                                                                                                                                                                                                                                 |
| eslint-config-next                         | 16.4.6                                                                                                      |                                                                                                                                                                                                                                                                  |
| Prettier                                   | 3.10.1                                                                                                      | defaults                                                                                                                                                                                                                                                         |
| @heroui/react, @heroui/styles              | 3.2.7                                                                                                       | Tailwind CSS 4.3.5                                                                                                                                                                                                                                               |
| prisma, @prisma/client, @prisma/adapter-pg | 7.10.1                                                                                                      | See decision D5                                                                                                                                                                                                                                                  |
| better-auth, `auth` CLI                    | 1.7.26 (1.7.27 was in Yarn's 24-hour quarantine, see Build results)                                         | See decision D6                                                                                                                                                                                                                                                  |
| zod                                        | 4.6.7                                                                                                       |                                                                                                                                                                                                                                                                  |
| vitest                                     | 5.1.1                                                                                                       | `@vitejs/plugin-react` 6.3.0, jsdom 31.0.1, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, vite-tsconfig-paths 6.1.1                                                                                                                            |
| @playwright/test                           | 1.65.1                                                                                                      |                                                                                                                                                                                                                                                                  |
| Docker images                              | `node:26.13.1-slim`, `postgres:17-alpine`, `rabbitmq:4.4-management`                                        | `slim` is glibc, which `@napi-rs/canvas` needs ([ADR-0009](../adr/0009-shared-card-rendering.md)). Supabase defaults to Postgres 17 ([Supabase changelog](https://supabase.com/changelog/46080-self-hosted-supabase-upgrading-from-pg-15-to-17-breaking-change)) |
| GitHub Actions                             | checkout v7, setup-node v7, cache v6, docker/login v4, setup-buildx v4, build-push v7, dependency-review v5 | latest releases                                                                                                                                                                                                                                                  |

The generators write their own pins. Keep them unless this table or a decision below says otherwise. The lockfile then pins everything.

## Decisions and [verify at build] items resolved now

- **D1. `nodeLinker: node-modules`: confirmed.** Yarn's default is PnP. Yarn says the node-modules linker gives "Perfect compatibility with the whole ecosystem" and is one of the "first-class citizens… used in production settings" ([Yarn, linkers](https://yarnpkg.com/features/linkers)). Three things need a real `node_modules`:
  - Node runs `apps/bot` without a loader.
  - Next.js standalone output copies "select files in `node_modules`" ([Next.js, output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).
  - The Turborepo Docker guide installs dependencies the classic way.

  Not verified: no Turborepo or Next.js page says anything about PnP.

- **D2. create-turbo cannot generate into this repository as it is.** The CLI refuses a folder that holds anything outside a short list. That list contains `.git` and `docs`, but not `CLAUDE.md`. Read from `create-turbo@2.11.13` `dist/cli.js`: "has N conflicting files - please try a different location". The CLI docs do not cover this ([create-turbo reference](https://turborepo.dev/docs/reference/create-turbo)). Standard fallback, used in Task 1: generate in a temporary folder, then copy the files without its `.git`. create-turbo runs `git init` and makes an initial commit only when it is not already inside a repository (same source). That `.git` is thrown away.
- **D3. TypeScript 5.9.3 everywhere, not 7.0.2.** create-turbo pins `typescript@7.0.2`, but typescript-eslint's peer range is `<6.1.0`, so typed linting (development.md) cannot load TS 7. Next.js documents a TS 7 side-by-side alias: "eslint-config-next still needs the TypeScript 6 compiler API" ([Next.js, ESLint](https://nextjs.org/docs/app/api-reference/config/eslint#with-typescript-7)). create-next-app writes `typescript: "^5"`, read from `create-next-app@16.4.6`. We keep the framework generator's value. The alias is open point 1.
- **D4. ESLint 9.39.5, not 10.** create-next-app writes `eslint: "^9"`, while the create-turbo example uses 10. Next.js warns that "Some of the plugins… don't list ESLint 10 in their peer dependencies yet" (same ESLint page). The project's framework generator wins (CLAUDE.md: "prefer the guide of the framework"). Note: ESLint 9 now carries the npm `maintenance` tag.
- **D5. Prisma 7.10.1, not `latest`.** The npm `latest` tag of `prisma` points to `8.0.0-rc.34`, a release candidate. Prisma says "Prisma 7 remains fully supported; Prisma 8 is a release candidate" ([Prisma, v7 getting started](https://www.prisma.io/docs/v7/getting-started)). It also says "For a new project, Prisma 8 is the recommended path", but Better Auth's adapter does not support Prisma 8 yet: "This guide uses Prisma 7" ([Better Auth, Prisma adapter](https://www.better-auth.com/docs/adapters/prisma)). The `better-auth` peer range is `prisma ^5 || ^6 || ^7`. So we pin `prisma@7.10.1`, which is the `prev` tag the Prisma v7 quickstart installs. This goes against Prisma's "new project" advice (open point 2).
- **D6. The Better Auth CLI is the `auth` package.** `@better-auth/cli` is deprecated on npm ("Package no longer supported"). The docs use `npx auth@latest generate` ([Better Auth, CLI](https://www.better-auth.com/docs/concepts/cli)).
- **D7. The bot runs TypeScript through Node type stripping.** Node says "Type stripping is now stable" and enabled by default ([Node.js, TypeScript](https://nodejs.org/api/typescript.html)). That means no build step and no extra dependency. The constraints are erasable syntax only and mandatory `.ts` extensions. `config-typescript/base.json` gets Node's recommended `rewriteRelativeImportExtensions`, `erasableSyntaxOnly` and `verbatimModuleSyntax`. Node refuses TS "inside folders under a `node_modules` path". Workspace packages resolve through symlinks to `packages/*`, which should avoid that **[verify at build, slice 1, when bot first imports a package]**. Fallback named by Node: `tsx`.
- **D8. The composite action cannot do the checkout.** ci-cd.md says it does, but GitHub says: "You must check out your repository before using the action" ([GitHub, workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)). Each job checks out first, then calls `./.github/actions/setup`. Task 16 updates ci-cd.md.
- **D9. Dependabot: confirmed.** Yarn v1 to v4 use `package-ecosystem: npm`. The other ecosystems are `github-actions` and `docker` ([GitHub, supported ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)).
- **D10. Next.js testing docs: confirmed online.** "Vitest currently does not support them… we recommend using E2E tests for `async` components" ([Next.js, Vitest](https://nextjs.org/docs/app/guides/testing/vitest)). Task 4 re-reads the same guide in `node_modules/next/dist/docs/01-app/02-guides/testing/`.
- **D11. Task names follow CLAUDE.md.** create-turbo names its type task `check-types`. We rename it to `typecheck`, because CLAUDE.md lists `yarn typecheck`. `format` stays a root Prettier script, not a Turborepo task, as create-turbo writes it.
- **D12. One test file: `yarn test --filter=<workspace> -- <path>`.** Turborepo passes arguments after `--` to "all tasks that are named in the run command" ([Turborepo, run](https://turborepo.dev/docs/reference/run)). Without the filter, every other workspace fails with "No test files found". The path is relative to the workspace. Only Yarn v1 swallows the first `--` (same source), so Yarn 4 forwards it. CLAUDE.md's `yarn test -- <path>` therefore needs `--filter` (open point 3).
- **D13. Environment in Turborepo.** Turborepo filters environment variables in strict mode, and `eslint-plugin-turbo` (kept from create-turbo) warns on undeclared ones. The variables of [development, environment variables](../technical/development.md#environment-variables) are listed once in `turbo.json` `globalEnv`, as the Prisma Turborepo guide does for `DATABASE_URL` ([Prisma, Turborepo v7](https://www.prisma.io/docs/guides/v7/deployment/turborepo)).

## File map

| Path                                      | Responsibility                                                                                                                                                | Origin                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `package.json`                            | workspaces, root scripts, `packageManager`, `engines`                                                                                                         | create-turbo, edited                                           |
| `.yarnrc.yml`                             | `nodeLinker: node-modules`                                                                                                                                    | hand, D1                                                       |
| `.nvmrc`                                  | `26`                                                                                                                                                          | hand                                                           |
| `turbo.json`                              | tasks and `globalEnv`                                                                                                                                         | create-turbo, edited                                           |
| `.gitignore`, `AGENTS.md`                 | ignores; turbo agent block                                                                                                                                    | create-turbo                                                   |
| `compose.dev.yaml`                        | PostgreSQL 17, RabbitMQ 4.4 for local work                                                                                                                    | hand                                                           |
| `.dockerignore`                           | keeps `node_modules`, `.next`, `.turbo`, `.env` and `out` out of the build context                                                                            | hand                                                           |
| `packages/config-typescript/base.json`    | strict TS plus Node type-stripping options                                                                                                                    | create-turbo `typescript-config`, edited                       |
| `packages/config-eslint/{base,strict}.js` | typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, Prettier, turbo plugin                                                                      | create-turbo `eslint-config`, edited                           |
| `packages/domain/`, `packages/card/`      | `package.json`, `src/index.ts` (`export {};`), `eslint.config.js` with the dependency rule, `tsconfig.json`                                                   | `turbo gen workspace`                                          |
| `packages/database/`                      | `prisma/schema.prisma`, Prisma config, `src/client.ts`, `src/index.ts`, `.env.example`                                                                        | `turbo gen workspace` + `prisma init` + Prisma Turborepo guide |
| `apps/dashboard/`                         | Next.js app: `src/app`, `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/env.ts`, `src/instrumentation.ts`, `e2e/`, `Dockerfile`, `.env.example` | create-next-app + HeroUI + Better Auth + Playwright            |
| `apps/bot/`                               | `src/{gateway,rest,bot,register-commands}.ts`, `src/env.ts`, `src/env.test.ts`, `Dockerfile`, `.env.example`                                                  | `turbo gen workspace`, hand                                    |
| `.github/actions/setup/action.yml`        | Node, Corepack, Yarn cache, `yarn install --immutable`                                                                                                        | hand                                                           |
| `.github/workflows/ci.yml`                | quality gate                                                                                                                                                  | hand                                                           |
| `.github/workflows/images.yml`            | build and push both images on `main`                                                                                                                          | hand                                                           |
| `.github/workflows/dependency-review.yml` | dependency review on pull requests                                                                                                                            | GitHub example                                                 |
| `.github/dependabot.yml`                  | npm, github-actions, docker                                                                                                                                   | hand                                                           |
| `.github/pull_request_template.md`        | what changes, rule IDs, how tested ([conventions](../technical/development.md#conventions))                                                                   | hand                                                           |

## Tasks

Work on branch `chore/foundation`. Each task ends with one commit: Conventional Commits, no `Co-Authored-By` trailer. After each task, `git status` must show nothing unexpected. Never commit a `.env`.

### Task 1 — Toolchain and create-turbo scaffold

Files: root `package.json`, `turbo.json`, `.gitignore`, `AGENTS.md`, `.npmrc`, `apps/*`, `packages/*` (as generated).

1. Get Node 26: `nvm install 26 && nvm use 26`, then check with `node -v`, which must print `v26.13.1`.
2. Install Corepack, then check that `corepack --version` prints `0.36.0`:

   ```sh
   npm install -g corepack@0.36.0 && corepack enable
   ```

3. Generate the monorepo in a temporary folder (D2):

   ```sh
   cd "$(mktemp -d)" && npx create-turbo@2.11.13 welcomer -m yarn --skip-install
   ```

   Check: `welcomer/` holds `apps/web`, `apps/docs`, `packages/ui`, `packages/eslint-config`, `packages/typescript-config`, `turbo.json`, and `package.json` with `workspaces`. With `-m yarn`, the transform drops `pnpm-workspace.yaml`.

4. Copy the scaffold into the repository without its `.git`:

   ```sh
   rsync -a --exclude .git welcomer/ /home/clement/code/welcomer/welcomer-v3/
   ```

   Check: `git status` shows only new files, and `docs/` and `CLAUDE.md` are unchanged.

5. Set up Yarn in the repository root:

   ```sh
   corepack use yarn@4.18.1
   printf 'nodeLinker: node-modules\n' > .yarnrc.yml
   echo 26 > .nvmrc
   ```

   Set `"engines": { "node": "^26" }`, then run `yarn install`. Check: `yarn --version` prints `4.18.1`, and a `node_modules/` folder exists.

6. Remove `.npmrc` if the transform left one: Yarn 4 does not read it.
7. Commit: `chore: scaffold monorepo with create-turbo`.

### Task 2 — Shape the example into Welcomer's layout

Files: `apps/web`, `apps/docs`, `packages/ui` (deleted); `packages/config-typescript`, `packages/config-eslint` (renamed); `turbo.json`; `package.json`.

1. Delete the example apps:

   ```sh
   git rm -r apps/web apps/docs packages/ui
   ```

   This is the turbo example content; Welcomer's apps come from their own generators.

2. Rename the config packages to the `config-*` layout of architecture 5.2. Package names stay `@repo/typescript-config` and `@repo/eslint-config`.

   ```sh
   git mv packages/typescript-config packages/config-typescript
   git mv packages/eslint-config packages/config-eslint
   ```

3. Delete `packages/config-typescript/{nextjs,react-library}.json` and `packages/config-eslint/{next,react-internal}.js`. They are unused: the dashboard keeps create-next-app's own `tsconfig.json` and ESLint file.
4. In `package.json`, rename `check-types` to `typecheck` (D11). Set `typescript` to `5.9.3` (D3). Set the scripts:

   ```json
   "build": "turbo run build",
   "dev": "turbo run dev dev:gateway dev:rest dev:bot",
   "lint": "turbo run lint",
   "typecheck": "turbo run typecheck",
   "test": "turbo run test",
   "e2e": "turbo run e2e",
   "format": "prettier --check .",
   "format:write": "prettier --write .",
   "db:migrate": "turbo run db:migrate",
   "db:seed": "turbo run db:seed"
   ```

5. Replace `turbo.json` with the following. It keeps create-turbo's `build`, `lint` and `dev` entries, adds the Prisma guide entries, and adds D13.

   ```json
   {
     "$schema": "https://turborepo.dev/schema.json",
     "ui": "tui",
     "globalEnv": [
       "DATABASE_URL",
       "RABBITMQ_URL",
       "DISCORD_TOKEN",
       "DISCORD_CLIENT_ID",
       "DISCORD_CLIENT_SECRET",
       "REST_PROXY_URL",
       "REST_PROXY_SECRET",
       "BETTER_AUTH_SECRET",
       "BETTER_AUTH_URL",
       "ADMIN_DISCORD_IDS",
       "SUPPORT_SERVER_URL",
       "LOG_LEVEL",
       "DISCORD_API_URL"
     ],
     "tasks": {
       "build": {
         "dependsOn": ["^build", "^db:generate"],
         "inputs": ["$TURBO_DEFAULT$", ".env*"],
         "outputs": [".next/**", "!.next/cache/**", "!.next/dev/**"]
       },
       "lint": { "dependsOn": ["^lint", "^db:generate", "db:generate"] },
       "typecheck": {
         "dependsOn": ["^typecheck", "^db:generate", "db:generate"]
       },
       "test": { "dependsOn": ["^db:generate"] },
       "e2e": { "dependsOn": ["build"] },
       "dev": {
         "dependsOn": ["^db:generate"],
         "cache": false,
         "persistent": true
       },
       "dev:gateway": { "cache": false, "persistent": true },
       "dev:rest": { "cache": false, "persistent": true },
       "dev:bot": { "cache": false, "persistent": true },
       "db:generate": { "cache": false },
       "db:migrate": { "cache": false },
       "db:deploy": { "cache": false },
       "db:seed": { "cache": false }
     }
   }
   ```

6. Check: `yarn install`, then `yarn turbo run typecheck` exits 0 (no tasks yet).
7. Commit: `refactor: adapt turborepo example to welcomer layout`.

### Task 3 — Strict shared lint and TypeScript configs

Files: `packages/config-eslint/{base.js,strict.js,package.json}`, `packages/config-typescript/base.json`.

1. Update the dependencies of `@repo/eslint-config`:
   - Remove `@babel/*` and `eslint-plugin-only-warn`. Babel replaces type information, and only-warn turns errors into warnings, which defeats "fails when any error" (ci-cd.md).
   - Pin `eslint@9.39.5` and `@eslint/js@9.39.5` (D4).
   - Add `typescript-eslint@8.73.0`.

   ```sh
   yarn workspace @repo/eslint-config remove @babel/core @babel/eslint-parser @babel/preset-typescript eslint-plugin-only-warn @next/eslint-plugin-next eslint-plugin-react-hooks
   yarn workspace @repo/eslint-config add -D eslint@9.39.5 @eslint/js@9.39.5 typescript-eslint@8.73.0
   ```

2. `strict.js` holds the typed presets ([typescript-eslint, typed linting](https://typescript-eslint.io/getting-started/typed-linting): "ask TypeScript's type checking service for each source file's type information"):

   ```js
   import tseslint from "typescript-eslint";

   export const strict = [
     ...tseslint.configs.strictTypeChecked,
     ...tseslint.configs.stylisticTypeChecked,
     { languageOptions: { parserOptions: { projectService: true } } },
     { files: ["**/*.{js,mjs,cjs}"], ...tseslint.configs.disableTypeChecked },
   ];
   ```

   `disableTypeChecked` covers the JS config files, which no `tsconfig` includes **[verify at build: preset name in typescript-eslint docs]**.

3. `base.js` keeps create-turbo's `js.configs.recommended`, `eslintConfigPrettier`, the turbo plugin and `ignores: ["dist/**"]`. It adds `...strict` and drops the Babel parser and only-warn. Exports: `"./base"` and `"./strict"`.
4. In `config-typescript/base.json`, keep create-turbo's options. Add Node's recommended options (D7): `"rewriteRelativeImportExtensions": true`, `"erasableSyntaxOnly": true`, `"verbatimModuleSyntax": true`, `"noEmit": true`. Set `declaration` and `declarationMap` to `false`, because nothing is emitted.
5. Check: `yarn install` exits 0.
6. Commit: `build: share strict typed eslint and typescript configs`.

### Task 4 — Dashboard from create-next-app

Files: `apps/dashboard/**` (generated), `apps/dashboard/next.config.ts`, `apps/dashboard/eslint.config.mjs`, `apps/dashboard/package.json`.

1. Generate the app. These are the development.md options (`src/`, alias `@/*`); everything else stays at create-next-app's defaults (Cache Components, AGENTS.md, Turbopack, no React Compiler).

   ```sh
   yarn dlx create-next-app@16.4.6 apps/dashboard --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-yarn --skip-install --disable-git --yes
   ```

   Check: `apps/dashboard/src/app/page.tsx` and `eslint.config.mjs` exist; `package.json` has `typescript: "^5"` and `eslint: "^9"`.

2. In `package.json`, set `"name": "dashboard"`. Add the scripts:
   - `"lint": "eslint --max-warnings 0"`, the create-turbo app script.
   - `"typecheck": "next typegen && tsc --noEmit"`, create-turbo's `check-types` body.

   Add `"@repo/eslint-config": "workspace:*"` to devDependencies.

3. Edit `next.config.ts` to add standalone output and monorepo tracing ([Next.js, output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output): "To include files outside of this folder you can set `outputFileTracingRoot`"):

   ```ts
   import path from "node:path";
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     output: "standalone",
     outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
   };

   export default nextConfig;
   ```

4. In `eslint.config.mjs`, keep the generated array. Append `...strict` from `@repo/eslint-config/strict` and `prettier` from `eslint-config-prettier/flat`. Next.js says "spread the Next.js config into your array", and its "With Prettier" section adds that line ([Next.js, ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)).

   ```sh
   yarn workspace dashboard add -D eslint-config-prettier
   ```

5. Run `yarn install`, then `yarn workspace dashboard build`, `yarn lint` and `yarn typecheck`. Check: all exit 0. If lint reports strict errors in the generated files, fix the code, not the rules.
6. Add `apps/dashboard/CLAUDE.md` with the single line `@AGENTS.md` (owner decision 6).
7. Read `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md` and `playwright.md`. Check that they match D10 and Task 5, and record any difference in Task 17.
8. Commit: `feat(dashboard): scaffold next.js app with create-next-app`.

### Task 5 — HeroUI and the e2e smoke test (test first)

Files: `apps/dashboard/src/app/globals.css`, `src/app/page.tsx`, `playwright.config.ts`, `e2e/home.spec.ts`, `package.json`.

1. Install Playwright with its official initializer, as the Next.js Playwright guide says:

   ```sh
   cd apps/dashboard && yarn create playwright
   ```

   Prompt answers: TypeScript; tests folder `e2e`; GitHub Actions workflow **No** (ci.yml covers it); install browsers **Yes**.

2. Delete the generated example tests. In `playwright.config.ts`:
   - Set `use.baseURL: "http://localhost:3000"`.
   - Set `webServer: { command: "yarn start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }`. Next.js recommends "running your tests against your production code" ([Next.js, Playwright](https://nextjs.org/docs/app/guides/testing/playwright)).
   - Keep the generator's three browser projects.

   Add the script `"e2e": "playwright test"`.

3. Write the test first, in `e2e/home.spec.ts`:

   ```ts
   import { test, expect } from "@playwright/test";

   test("home page shows the product name", async ({ page }) => {
     await page.goto("/");

     await expect(
       page.getByRole("heading", { level: 1, name: "Welcomer" }),
     ).toBeVisible();
   });
   ```

   Run `yarn e2e`. Expected: it FAILS, because the generated page has no "Welcomer" heading.

4. Install HeroUI as its quick start says ([HeroUI, quick start](https://heroui.com/docs/react/getting-started/quick-start): "Import order matters. Always import `tailwindcss` first"; "does not require a Provider"):

   ```sh
   yarn workspace dashboard add @heroui/styles @heroui/react
   ```

   In `globals.css`, place `@import "@heroui/styles";` right after `@import "tailwindcss";`. Remove the template's own theme variables and `body` rules: ADR-0010 says the default HeroUI theme with no custom tokens.

5. Replace `page.tsx` with `export default function Home() { return <main><h1>Welcomer</h1></main>; }`. Delete the template's unused `public/*.svg` files.
6. Run `yarn e2e` (Turborepo builds first). Expected: PASS.
7. Commit: `feat(dashboard): install heroui and add e2e smoke test`.

### Task 6 — Empty domain and card packages, dependency rule

Files: `packages/domain/*`, `packages/card/*`.

1. Generate the two packages:

   ```sh
   yarn turbo gen workspace --name @repo/domain --type package --destination packages/domain --empty
   yarn turbo gen workspace --name @repo/card --type package --destination packages/card --empty
   ```

2. In each package:
   - `package.json`: `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, scripts `"lint": "eslint --max-warnings 0"` and `"typecheck": "tsc"`, and devDependencies on both config packages.
   - `src/index.ts`: `export {};`.
   - `tsconfig.json`: `{ "extends": "@repo/typescript-config/base.json", "include": ["src"] }`.
   - `eslint.config.js`: `[...config, { rules: { "no-restricted-imports": ["error", { patterns: ["@prisma/*", "@repo/database", "discordeno", "@discordeno/*", "next", "next/*", "react", "react-dom", "better-auth", "better-auth/*", "dashboard", "bot"] }] } }]`. This is the dependency rule of development.md, enforced with ESLint's core rule.
3. Check: `yarn lint` and `yarn typecheck` exit 0. Then add `import "next";` to `packages/domain/src/index.ts` and run `yarn lint`: it must fail with `no-restricted-imports`. Revert the import.
4. Commit: `feat: add empty domain and card packages with dependency rule`.

### Task 7 — Database package with Prisma 7

Files: `packages/database/{package.json,prisma/schema.prisma,prisma config,src/client.ts,src/index.ts,.env.example,tsconfig.json,eslint.config.js}`, root `.gitignore`.

1. Generate the package:

   ```sh
   yarn turbo gen workspace --name @repo/database --type package --destination packages/database --empty
   ```

2. Install Prisma 7 (D5). These are the Prisma v7 quickstart's packages, with exact versions ([Prisma v7 quickstart](https://www.prisma.io/docs/v7/prisma-orm/quickstart/postgresql)):

   ```sh
   yarn workspace @repo/database add -D prisma@7.10.1 @types/pg
   yarn workspace @repo/database add @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg dotenv
   ```

3. Initialize Prisma:

   ```sh
   cd packages/database && yarn prisma init --datasource-provider postgresql --output ../generated/prisma
   ```

   Check: `prisma/schema.prisma` has `provider = "prisma-client"` and `output = "../generated/prisma"`. Expect a config file named `prisma7.config.ts`; Prisma 7.10+ "uses the name `prisma7.config.ts`" (same source). Keep whatever name the CLI writes. Rename `.env` to `.env.example` and set `DATABASE_URL="postgresql://welcomer:welcomer@localhost:5432/welcomer"`, matching compose.

4. Copy `src/client.ts` and `src/index.ts` verbatim from the [Prisma Turborepo v7 guide](https://www.prisma.io/docs/guides/v7/deployment/turborepo). Use `.ts` import extensions (D7). In `package.json`:
   - `"type": "module"` and `"exports": { ".": "./src/index.ts" }`.
   - Scripts from the guide: `db:generate` (`prisma generate`), `db:migrate` (`prisma migrate dev`), `db:deploy` (`prisma migrate deploy`).
   - `lint` and `typecheck` as in Task 6.

   Add `packages/database/generated` to the root `.gitignore`, as the guide says.

5. Do not add a `db:seed` script yet: there is nothing to seed until slice 1 (open point 4). The root `yarn db:seed` exists and runs no task.
6. Check: `yarn turbo run db:generate` writes `generated/prisma`. `yarn lint` and `yarn typecheck` exit 0.
7. Commit: `feat(database): add prisma 7 package`.

### Task 8 — Local services

Files: `compose.dev.yaml`.

1. Write the compose file:

   ```yaml
   services:
     postgres:
       image: postgres:17-alpine
       environment:
         {
           POSTGRES_USER: welcomer,
           POSTGRES_PASSWORD: welcomer,
           POSTGRES_DB: welcomer,
         }
       ports: ["5432:5432"]
       volumes: [postgres:/var/lib/postgresql/data]
       healthcheck:
         {
           test: ["CMD", "pg_isready", "-U", "welcomer"],
           interval: 5s,
           retries: 10,
         }
     rabbitmq:
       image: rabbitmq:4.4-management
       ports: ["5672:5672", "15672:15672"]
       healthcheck:
         {
           test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"],
           interval: 10s,
           retries: 10,
         }
   volumes:
     postgres:
   ```

2. Check: `docker compose -f compose.dev.yaml up -d --wait` exits 0 with both services healthy ([Docker, compose up](https://docs.docker.com/reference/cli/docker/compose/up/)).
3. Commit: `chore: add local postgres and rabbitmq compose file`.

### Task 9 — Better Auth in the dashboard, tables through its CLI

Files: `apps/dashboard/src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `packages/database/prisma/schema.prisma`, `packages/database/prisma/migrations/*`.

1. Install Better Auth and link the database package:

   ```sh
   yarn workspace dashboard add better-auth@1.7.26 @repo/database@workspace:*
   ```

2. Write `src/lib/auth.ts`, combining the [installation](https://www.better-auth.com/docs/installation), [Prisma adapter](https://www.better-auth.com/docs/adapters/prisma) and [Discord](https://www.better-auth.com/docs/authentication/discord) snippets. Better Auth looks for the file in `lib/` under `src/`. Slice 2 adds scopes and `mapProfileToUser`.

   ```ts
   import { betterAuth } from "better-auth";
   import { prismaAdapter } from "better-auth/adapters/prisma";
   import { prisma } from "@repo/database";

   export const auth = betterAuth({
     database: prismaAdapter(prisma, { provider: "postgresql" }),
     socialProviders: {
       discord: {
         clientId: process.env.DISCORD_CLIENT_ID as string,
         clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
       },
     },
   });
   ```

3. Copy `route.ts` verbatim from the installation guide (`toNextJsHandler(auth)`).
4. Generate the tables and migrate. Expected: the `User`, `Session`, `Account` and `Verification` models are added, and the migration applies.

   ```sh
   cd apps/dashboard && yarn dlx auth@1.7.26 generate --output ../../packages/database/prisma/schema.prisma --yes
   cd ../.. && yarn db:migrate -- --name better_auth
   ```

5. Check: `yarn build` exits 0 with no `.env` in the shell. That proves the build reads no secret **[verify at build: Better Auth may refuse a missing secret during `next build`; if so, read its docs before changing anything]**.
6. Commit: `feat(dashboard): add better auth with prisma adapter and discord provider`.

### Task 10 — Dashboard environment check (test first)

Files: `apps/dashboard/{vitest.config.mts,src/env.ts,src/env.test.ts,src/instrumentation.ts,.env.example}`.

1. Install Vitest as the Next.js guide says, with `zod` as the runtime dependency:

   ```sh
   yarn workspace dashboard add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
   yarn workspace dashboard add zod
   ```

   Copy `vitest.config.mts` verbatim from the guide, and add the script `"test": "vitest run"`.

2. Write `.env.example`. It lists the dashboard variables of development.md, with local values that satisfy the schema, and placeholders for the secrets.
3. Write the test first, in `src/env.test.ts`:

   ```ts
   import { expect, test } from "vitest";
   import { dashboardEnv } from "./env";

   const complete = {
     DATABASE_URL: "postgresql://u:p@localhost:5432/db",
     DISCORD_CLIENT_ID: "1",
     DISCORD_CLIENT_SECRET: "s",
     REST_PROXY_URL: "http://localhost:8000",
     REST_PROXY_SECRET: "s",
     BETTER_AUTH_SECRET: "x".repeat(32),
     BETTER_AUTH_URL: "http://localhost:3000",
     ADMIN_DISCORD_IDS: "1",
     SUPPORT_SERVER_URL: "https://discord.gg/x",
   };

   test("architecture 8.1: starts when every variable is set", () => {
     expect(() => dashboardEnv.parse(complete)).not.toThrow();
   });

   test("architecture 8.1: stops when a variable is missing", () => {
     const { DATABASE_URL: _omitted, ...missing } = complete;

     expect(() => dashboardEnv.parse(missing)).toThrow(/DATABASE_URL/);
   });
   ```

   Run `yarn test --filter=dashboard`. Expected: FAIL, because the module is missing.

4. Write `src/env.ts`. The 32-character minimum comes from Better Auth: the secret "must be at least 32 characters".

   ```ts
   import { z } from "zod";

   export const dashboardEnv = z.object({
     DATABASE_URL: z.url(),
     DISCORD_CLIENT_ID: z.string().min(1),
     DISCORD_CLIENT_SECRET: z.string().min(1),
     REST_PROXY_URL: z.url(),
     REST_PROXY_SECRET: z.string().min(1),
     BETTER_AUTH_SECRET: z.string().min(32),
     BETTER_AUTH_URL: z.url(),
     ADMIN_DISCORD_IDS: z.string().min(1),
     SUPPORT_SERVER_URL: z.url(),
     LOG_LEVEL: z
       .enum(["fatal", "error", "warn", "info", "debug", "trace"])
       .default("info"),
     DISCORD_API_URL: z.url().default("https://discord.com/api/v10"),
   });
   ```

5. Write `src/instrumentation.ts`: `export function register() { dashboardEnv.parse(process.env); }`. Next.js says to "run code on server startup using the `register` function" ([Next.js, self-hosting](https://nextjs.org/docs/app/guides/self-hosting)), so the check runs at start, not at build.
6. Check: `yarn test --filter=dashboard` passes. Then `cp apps/dashboard/.env.example apps/dashboard/.env && yarn e2e` passes. Finally, start without `.env`: `yarn workspace dashboard start` exits with the Zod error.
7. Commit: `feat(dashboard): check environment variables at start`.

### Task 11 — Bot app with four entry points (test first)

Files: `apps/bot/{package.json,tsconfig.json,eslint.config.js,src/env.ts,src/env.test.ts,src/gateway.ts,src/rest.ts,src/bot.ts,src/register-commands.ts,.env.example}`.

1. Generate the app and install its dependencies:

   ```sh
   yarn turbo gen workspace --name bot --type app --destination apps/bot --empty
   yarn workspace bot add zod
   yarn workspace bot add -D vitest @types/node typescript@5.9.3
   ```

   Also add both config packages as devDependencies, and use the `tsconfig.json` and `eslint.config.js` of Task 6, without the restricted imports.

2. Set the scripts in `package.json`. Vitest runs with its defaults, so there is no config file. `--watch` and `--env-file-if-exists` are Node built-ins.

   ```json
   "dev:gateway": "node --watch --env-file-if-exists=.env src/gateway.ts",
   "dev:rest": "node --watch --env-file-if-exists=.env src/rest.ts",
   "dev:bot": "node --watch --env-file-if-exists=.env src/bot.ts",
   "register-commands": "node --env-file-if-exists=.env src/register-commands.ts",
   "lint": "eslint --max-warnings 0",
   "typecheck": "tsc",
   "test": "vitest run"
   ```

3. Write the test first, in `src/env.test.ts`. Use the same two cases as Task 10, `it.each` over the four schemas, each with its complete object. Name the tests `architecture 8.1: <process> starts when every variable is set` and `architecture 8.1: <process> stops when a variable is missing`. Run `yarn test --filter=bot`. Expected: FAIL.
4. Write `src/env.ts`, with one Zod object per process from development.md:

   | Schema                | Variables                                                                                   |
   | --------------------- | ------------------------------------------------------------------------------------------- |
   | `gatewayEnv`          | `DATABASE_URL`, `RABBITMQ_URL`, `DISCORD_TOKEN`                                             |
   | `restEnv`             | `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `REST_PROXY_SECRET`                                   |
   | `botEnv`              | `DATABASE_URL`, `RABBITMQ_URL`, `REST_PROXY_URL`, `REST_PROXY_SECRET`, `SUPPORT_SERVER_URL` |
   | `registerCommandsEnv` | `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` (open point 5)                                         |

   Every schema also has `LOG_LEVEL`, as in Task 10. `RABBITMQ_URL` is `z.url()` **[verify at build: accepts `amqp://`]**.

5. Write each entry point as `import { gatewayEnv } from "./env.ts"; gatewayEnv.parse(process.env);`, with the matching schema in each. Write `.env.example` with local values.
6. Check:
   - `yarn test --filter=bot` passes.
   - `cp apps/bot/.env.example apps/bot/.env && yarn dev` starts the dashboard on :3000, and the three bot tasks run and wait for changes.
   - `node apps/bot/src/gateway.ts` without `.env` exits 1 with the Zod error.
7. Commit: `feat(bot): add gateway, rest, bot and register-commands entry points`.

### Task 12 — Prettier over the repository

1. Run `yarn format:write`. It reformats `docs/` and the generated files, and Prettier skips `.gitignore` entries by default.
2. Check: `yarn format` exits 0, and `git diff --stat` shows only whitespace and table alignment.
3. Commit: `style: format repository with prettier`.

### Task 13 — Docker images

Files: `apps/dashboard/Dockerfile`, `apps/bot/Dockerfile`, `.dockerignore`.

1. Write `apps/dashboard/Dockerfile`, the [Turborepo Docker guide](https://turborepo.dev/docs/guides/tools/docker) Dockerfile with these changes:
   - `base`: `node:26.13.1-slim`. Install Corepack there: `RUN npm install -g corepack@0.36.0 && corepack enable`.
   - `prepare`: install `curl` with `apt-get` and fetch turbo `2.11.13` with the guide's checksum block ("Standalone release archives start at 2.11.5"). Then run `turbo prune dashboard --docker`.
   - `builder`: run `COPY --from=prepare /app/out/json/ .` and `COPY .yarnrc.yml .` **[verify at build: whether prune copies `.yarnrc.yml`; drop the line if it does]**. Then run `yarn install --immutable`, copy `out/full`, and run `yarn turbo build --filter=dashboard`.
   - `runner`: same as the guide, with paths `apps/dashboard/...` and `CMD ["node", "apps/dashboard/server.js"]`.
2. Write `apps/bot/Dockerfile`. It uses the same `base`, `prepare` (`turbo prune bot --docker`) and install steps. There is no build step (D7). The runner copies `/app` as the guide's `api` example does, runs as a non-root user, and uses `CMD ["node", "apps/bot/src/bot.ts"]`. Compose overrides the command for gateway, rest and register-commands.
3. Write `.dockerignore`: `node_modules`, `**/node_modules`, `.next`, `**/.next`, `.turbo`, `out`, `**/.env`, `.git`. Next.js keeps `.env` out of the build context: "leaving `.env` out of the build context with `.dockerignore`" ([Next.js, output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).
4. Check:
   - `docker build -f apps/dashboard/Dockerfile -t welcomer-dashboard .` exits 0.
   - `docker build -f apps/bot/Dockerfile -t welcomer-bot .` exits 0.
   - `docker run --rm --env-file apps/bot/.env welcomer-bot` exits 0.
   - `docker run --rm -p 3000:3000 --env-file apps/dashboard/.env welcomer-dashboard` serves `/`.
5. Commit: `build: add dashboard and bot dockerfiles from turborepo docker guide`.

### Task 14 — Setup action and CI workflow

Files: `.github/actions/setup/action.yml`, `.github/workflows/ci.yml`.

1. Write the composite action `setup`, which runs after checkout (D8):
   1. `actions/setup-node@v7` with `node-version-file: .nvmrc`.
   2. `npm install -g corepack@0.36.0 && corepack enable`.
   3. The actions/cache "Node - Yarn 2" example: `yarn config get cacheFolder`, then `actions/cache@v6` keyed on `yarn.lock` **[verify at build: with `enableGlobalCache` on, the folder to cache may be the global folder]**.
   4. `yarn install --immutable`.
2. Write `ci.yml`:
   - Triggers: `on: { pull_request: {}, push: { branches: [main] } }`, with no `paths` filter. Permissions: `contents: read`.
   - Every job starts with `actions/checkout@v7` with `fetch-depth: 0` and `filter: blob:none`, as Turborepo advises: "set `filter: blob:none` and `fetch-depth: 0`" ([Turborepo, constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci)). Then it runs `./.github/actions/setup`.

   | Job         | Steps after setup                                                                                                                                                                                                                                             |
   | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `lint`      | `yarn turbo run lint --affected`                                                                                                                                                                                                                              |
   | `format`    | `yarn format`                                                                                                                                                                                                                                                 |
   | `typecheck` | `yarn turbo run typecheck --affected`                                                                                                                                                                                                                         |
   | `test`      | runs with a `postgres:17-alpine` service, port 5432, user, password and database `welcomer`, and health options `pg_isready`. Steps: `cp packages/database/.env.example packages/database/.env`, `yarn turbo run db:deploy`, `yarn turbo run test --affected` |
   | `e2e`       | `cp apps/dashboard/.env.example apps/dashboard/.env`, `yarn workspace dashboard playwright install --with-deps`, `yarn turbo run e2e --affected`                                                                                                              |
   | `build`     | `yarn turbo run build --affected`, `docker/setup-buildx-action@v4`, then `docker/build-push-action@v7` for each Dockerfile, with `push: false` and `cache-from: type=gha,scope=<image>`                                                                       |

   The `.env.example` copies are local setup step 3 of development.md: they hold no secret.

3. Check: `yarn lint && yarn format && yarn typecheck && yarn test && yarn e2e && yarn build` passes locally. The workflow itself is checked in Task 18.
4. Commit: `ci: add quality gate workflow`.

### Task 15 — Image workflow

Files: `.github/workflows/images.yml`.

1. Set the trigger to `on: workflow_run: { workflows: [CI], types: [completed], branches: [main] }`. The job is `push-image`, a name unique across workflows. It uses a matrix `image: [dashboard, bot]` and runs only when `github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'`. GitHub: "triggered regardless of the conclusion of the previous workflow" ([GitHub, events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)).
2. Set permissions `contents: read` and `packages: write` ([GitHub, publishing with Actions](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)).
3. Steps:
   1. Checkout with `ref: ${{ github.event.workflow_run.head_sha }}`.
   2. `docker/login-action@v4` with `registry: ghcr.io`, `username: ${{ github.actor }}` and `password: ${{ secrets.GITHUB_TOKEN }}`.
   3. `docker/setup-buildx-action@v4`.
   4. `docker/build-push-action@v7` with:
      - `context: .` and `file: apps/${{ matrix.image }}/Dockerfile`
      - `push: true`
      - `tags: ghcr.io/welcomer-bot/welcomer-${{ matrix.image }}:${{ github.event.workflow_run.head_sha }}`
      - `cache-from: type=gha,scope=${{ matrix.image }}` and `cache-to: type=gha,mode=max,scope=${{ matrix.image }}` ([Docker, GitHub Actions cache](https://docs.docker.com/build/ci/github-actions/cache/))
4. Check: `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest` reports no errors. The real run is checked in Task 18.
5. Commit: `ci: build and push images to ghcr on main`.

### Task 16 — Dependency review, Dependabot, PR template

Files: `.github/workflows/dependency-review.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`, `docs/technical/ci-cd.md`.

1. Write `dependency-review.yml` from GitHub's minimal example, with job `dependency-review`, `actions/checkout@v7` and `actions/dependency-review-action@v5` ([GitHub, dependency review action](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/configuring-the-dependency-review-action)).
2. Write `dependabot.yml`, version 2, with weekly updates for:
   - `npm` at `/`
   - `github-actions` at `/`
   - `docker` with `directories: ["/apps/bot", "/apps/dashboard"]` **[verify at build: `directories` key]**
3. Write the PR template with three headings: what changes, rule IDs, how it was tested.
4. In ci-cd.md, change "A shared composite action does checkout…" to say each job checks out, then calls the action (D8).
5. Commit: `ci: add dependency review, dependabot and pull request template`.

### Task 17 — Record the verification results in the docs

Files: `docs/technical/development.md`, `ci-cd.md`, `test-strategy.md`, `docs/adr/0002…`, `docs/adr/0006…`.

Do this after Task 18 so that all results are known. Then write each result back with its source and remove its **[verify at build]** marker:

- nodeLinker (D1)
- Corepack install (Node 26)
- the Vitest and Playwright guides (D10, Task 4.7)
- Dependabot (D9)
- the required-approval check (Task 18)
- the Better Auth CLI name (D6, in ADR-0006 "More Information")

Add the versions of this plan to the Tools table of development.md, and the test-file command (D12).

Commit: `docs: record slice 0 verification results`.

### Task 18 — Publish and green on GitHub (owner)

These steps need the owner: the repository has no remote, and the GitHub organization `Welcomer-bot` is the owner's.

1. Create the public repository and add it as `origin`. Push `main` with only `docs/`, then push `chore/foundation` and open a pull request with a Conventional Commits title: `chore: foundation (slice 0)`.
2. In the repository settings:
   - Enable CodeQL default setup for JavaScript and TypeScript (Settings → Code security → Code scanning → Default). It "does not currently require special configuration".
   - Protect `main`: pull request required, with the required checks `lint`, `format`, `typecheck`, `test`, `e2e`, `build` and `dependency-review`, and "require branches to be up to date".
   - Leave required approvals at 0. Then check that a solo author can merge **[verify at build]**.
3. Check: every check on the pull request is green. After the merge, CI on `main` is green, `images.yml` pushes `welcomer-dashboard:<sha>` and `welcomer-bot:<sha>` to GHCR, and CodeQL shows a first analysis.
4. Do Task 17, then the independent review of the slice.

## Done when

- [ ] Every slice-0 element of the roadmap exists:
  - the monorepo, from the official generators
  - `apps/bot` with four entry points, and `apps/dashboard`
  - `packages/domain`, `packages/card`, `packages/database`, and the `config-*` packages
  - `compose.dev.yaml`, a `.env.example` per app and for the database, and a Zod check at start
  - `ci.yml`, `images.yml`, CodeQL default setup, dependency review and Dependabot
- [ ] The tests were written first and fail without their code. That covers the environment checks (dashboard and four bot processes) and the e2e smoke test; there are no other tests.
- [ ] The quality gate passes on `main`, and both images are on GHCR, tagged with the commit SHA (roadmap definition of done 2).
- [ ] The architecture rules hold:
  - `packages/domain` and `packages/card` lint-fail on any infrastructure import.
  - Lint is strict and typed, with `--max-warnings 0`.
  - TypeScript is `strict`.
  - Prettier keeps its defaults (definition of done 3).
- [ ] An independent review of the slice against development.md, ci-cd.md and this plan found nothing left to fix (definition of done 4).
- [ ] Every slice-0 **[verify at build]** item is checked and written back into the docs (Task 17, definition of done 5).
- [ ] The CLAUDE.md commands work from the root: `yarn dev`, `lint`, `format`, `format:write`, `typecheck`, `test`, `e2e`, `build`, `db:migrate`, `db:seed`. One test file runs with `yarn test --filter=<workspace> -- <path>`.

## Owner decisions (2026-11-20)

1. TypeScript 5.9.3 (D3), the value create-next-app writes.
2. Prisma 7.10.1 (D5): a deliberate deviation from Prisma's "new project: Prisma 8" advice, since Prisma 8 is a release candidate and Better Auth's adapter targets Prisma 7.
3. One test file: `yarn test --filter=<workspace> -- <path>` (D12); CLAUDE.md is updated.
4. `yarn db:seed`: the root script exists now; the seed file comes with slice 1.
5. `register-commands` uses `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`; development.md is updated.
6. create-next-app and turbo defaults are kept, `AGENTS.md` and agent feedback included. Claude Code does not read `AGENTS.md` when a `CLAUDE.md` exists, so Task 4 adds `apps/dashboard/CLAUDE.md` holding `@AGENTS.md` ([Claude Code, memory](https://code.claude.com/docs/en/memory): "Add any Claude-specific instructions below the import").
7. GitHub organization: `Welcomer-bot`. Images: `ghcr.io/welcomer-bot/welcomer-dashboard` and `ghcr.io/welcomer-bot/welcomer-bot`.

8. Slice 1 starts `apps/bot` from discordeno's official big bot template, [`examples/bigbot`](https://github.com/discordeno/discordeno/tree/main/examples/bigbot) ("configured with a REST proxy, the Gateway in a separate process and the Bot code in another"), with discordeno v22 (npm tags on 2026-11-20: `beta` 22.0.0-beta.2, `next` 22.0.1-next.0674dd9; `latest` is 21.0.0). This goes against "latest stable" ([CI, versions](../technical/ci-cd.md#versions)); the slice 1 plan picks the exact tag. The template builds with `tsc` to `dist/` and states Node 18 to 22, while D7 runs TypeScript with Node 26 type stripping: the slice 1 plan settles both.

## Build results (2026-11-20)

Each item was found while running the tasks; the fix is the one the cited source gives.

- Task 1: create-turbo writes `devEngines.packageManager` with the machine's Yarn (1.22.22) and `engines.node: ">=24"`. Corepack enforces `devEngines` ("Corepack will use it to validate", Corepack README), so `corepack use yarn@4.18.1` failed. Its version is set to 4.18.1 before `corepack use`. The `-m yarn` transform leaves an empty `.npmrc` (removed). `.gitignore` gets Yarn's block for projects without Zero-Installs, otherwise `.yarn/install-state.gz` shows up.
- Task 4: create-next-app 16.4.6 also writes `cacheComponents`, `partialPrefetching` and a Turbopack Tailwind rule in `next.config.ts`; they are kept, and only `output` and `outputFileTracingRoot` are added. The bundled Vitest and Playwright guides match D10.
- Task 5: `yarn create playwright` needs a terminal for its prompts; it ran with `--quiet --lang=TypeScript` (no GitHub Actions file, browsers installed), then `tests` was renamed `e2e`, the answer the plan gives. WebKit cannot start on a machine without its system libraries: owner step `sudo yarn workspace dashboard playwright install-deps`.
- Task 6: `turbo gen workspace --empty` writes placeholder `echo` scripts; they are replaced. A Yarn 4 script only sees the binaries its package declares: without `eslint` in `devDependencies`, `eslint` resolved to a global binary that printed its help and exited 0. Each linted package declares `eslint` and `typescript`.
- Task 7: `prisma init` 7.10.1 writes `prisma7.config.ts`, its own `.gitignore`, and agent skills (`.agents/skills`, `.claude/skills` and `.windsurf/skills` links, `skills-lock.json`). They are kept as generator output (decision 6) and left out of Prettier. `NODE_ENV`, read by the guide's client, joins `globalEnv`, as in Turborepo's configuration reference.
- Task 9: Yarn's default `npmMinimalAgeGate` (24 hours) quarantined better-auth 1.7.27, published that morning; 1.7.26 is used, the gate stays on. The dashboard type-checks the database package's `.ts` imports (D7), so its `tsconfig.json` adds `allowImportingTsExtensions`, which TypeScript allows with `noEmit`. `next build` succeeds with no environment.
- Task 10: Vitest 5 needs `vite` installed explicitly under Yarn ([Vitest, migration](https://vitest.dev/guide/migration): "It is now a required peer dependency"). Vitest collected the Playwright specs, so `e2e/**` joins `configDefaults.exclude`. The strict preset rejects both `as string` and `!` in Better Auth's Discord snippet: the values use `?? ""`, with a comment, because the start check runs first. create-next-app's `.gitignore` ignores `.env*`, so `!.env.example` opts the example in, as its comment invites.
- Task 10, fixed after the review: Next.js only logs an error thrown from `register()` and keeps serving (`next-server.js`, "Failed to prepare server"), so the dashboard stayed up and answered 500. The check now lives in `instrumentation-node.ts`, imported only when `NEXT_RUNTIME` is `nodejs` (Next.js instrumentation guide, "Importing runtime-specific code"), and calls `process.exit(1)`. Playwright's `webServer` runs the standalone `server.js` with `.next/static` copied in, as the Next.js output docs say, since `next start` "does not work with output: standalone".
- Task 11: `z.url()` accepts `amqp://`.
- Task 12: Prettier reads only the root `.gitignore`, so `.prettierignore` lists the Prisma agent skills and Playwright's reports.
- Task 13: `turbo prune --docker` copies `.yarnrc.yml`, so that `COPY` line is dropped. On `slim`, `curl` needs `ca-certificates`. With no `public/` folder left, the guide's `public` copy is dropped. Docker `--env-file` keeps quotes as part of the value, so the apps' `.env.example` values are unquoted.
- Task 14: the `build` job runs both image builds in one job: a matrix would name its checks `build (dashboard)` and `build (bot)`, which do not match the required check `build`. `yarn config get cacheFolder` already returns the global cache.

## Not verified

Checked during the build (results in Build results and in the docs): `turbo prune` copies `.yarnrc.yml`; the Yarn cache path; `disableTypeChecked` (exported by typescript-eslint 8.73.0, and the JS config files lint without type errors); Better Auth's secret during `next build`; `z.url()` with `amqp://`; Dependabot's `directories` key; the solo merge with no required approval; the `.npmrc` left by `-m yarn`.

Still open:

- Whether Node type stripping works on workspace packages that are reached through `node_modules` symlinks. Deferred to slice 1.
- discordeno's package and Node requirements: slice 1 (decision 8).
