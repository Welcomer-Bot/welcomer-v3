# CI

Quality gate on every change, then the Docker images of each app on `main`. Runs on GitHub Actions. Deploying to the server comes later ([requirements, later](../requirements.md#later)).

## Branches

- The repository is public on GitHub.
- `main` is protected: changes arrive only by pull request; direct pushes are refused.
- Required status checks: every job of the CI workflow below, with "require branches to be up to date" ([GitHub, protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): "Required status checks must have a successful, skipped, or neutral status").
- Job names are unique across workflows, so required checks are unambiguous (same source).
- No required approval: the owner works alone, and the author of a pull request cannot approve it ([GitHub, approving a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/approving-a-pull-request-with-required-reviews)) **[verify at build: on the first pull request, in slice 0 Task 18, by the owner]**.
- Commit messages and pull request titles follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).

## CI workflow: the quality gate

`ci.yml`, on `pull_request` and on `push` to `main`. No workflow-level `paths` filter: a workflow skipped by path filtering leaves its required checks pending ([GitHub, workflow syntax, paths](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore)). Each job runs only on changed workspaces with `turbo run <task> --affected`, which needs the full history: `actions/checkout` with `fetch-depth: 0` ([Turborepo, constructing CI](https://turborepo.dev/docs/crafting-your-repository/constructing-ci): "A clone with sufficient history is necessary for comparisons").

| Job         | Runs                                                                   | Fails when           |
| ----------- | ---------------------------------------------------------------------- | -------------------- |
| `lint`      | ESLint                                                                 | any error            |
| `format`    | Prettier check                                                         | any unformatted file |
| `typecheck` | `tsc --noEmit` per workspace                                           | any type error       |
| `test`      | Vitest unit and integration tests, with a PostgreSQL service container | any failing test     |
| `e2e`       | Playwright against the built dashboard                                 | any failing journey  |
| `build`     | production build of each affected app and image build without push     | build error          |

Each job checks out the repository first, then calls a shared composite action for Node setup with the Yarn cache and `yarn install --immutable`. The action cannot do the checkout itself: "You must check out your repository before using the action" ([GitHub, workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)).

Also on every pull request:

- **CodeQL** default setup for JavaScript and TypeScript, which "does not currently require special configuration" ([GitHub, CodeQL default setup](https://docs.github.com/en/code-security/code-scanning/enabling-code-scanning/configuring-default-setup-for-code-scanning)); it needs a public repository or GitHub Code Security; the repository is public.
- **Dependency review** of added packages, and **Dependabot** version updates for npm, GitHub Actions and Docker. Checked in slice 0: Yarn v1 to v4 use the `npm` ecosystem ([GitHub, supported ecosystems](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)); the two Dockerfiles are listed with `directories` ([Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference): "Use `directories` to define a list of multiple directories of manifests"). Dependency review uses GitHub's minimal workflow.

## Image workflow

`images.yml`, when the CI workflow succeeds on `main` (`workflow_run`). It builds both images, each from a `turbo prune --docker` output ([Turborepo, Docker](https://turborepo.dev/docs/guides/tools/docker)), with the GitHub Actions build cache, and pushes them to GHCR tagged with the commit SHA.

| Image     | Built from       | Runs                                                            |
| --------- | ---------------- | --------------------------------------------------------------- |
| dashboard | `apps/dashboard` | the dashboard                                                   |
| bot       | `apps/bot`       | gateway, rest and bot (three commands), and `register-commands` |

## Versions

Each tool is installed at its latest stable version when the repository is created, with its official initializer, then pinned by the lockfile. Exact versions are recorded in the scaffold plan, not here. Node.js and Yarn: [development](./development.md#tools). No Turborepo remote cache.
