# GitHub Environments (IaC)

Committed JSON under this directory describes **GitHub Environment protection**
(reviewers, deployment branch policy). Deploy **secrets** live in GitHub
Environments and are synced from gitignored `.env.development` /
`.env.production` at the repo root (or from `config.setup.env` via the legacy
path).

## Mapping

Single-trunk model — one branch (`main`) drives both environments by **purpose**,
not by branch:

| Trigger                        | GitHub Environment | Deploy                | Local secrets file |
| ------------------------------ | ------------------ | --------------------- | ------------------ |
| every push to `main`           | `development`      | `--alias development` | `.env.development` |
| a release (`vX.Y.Z`) on `main` | `production`       | `--prod`              | `.env.production`  |

Canonical manifest: [`tooling/setup/setup.config.json`](../../tooling/setup/setup.config.json).

## Required deploy secrets

These must be present or post-merge Netlify deploy **fails** (no silent skip):

- `VITE_API_BASE_URL`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Optional (warn only): `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_PRIVACY_POLICY_URL`.

## Secret placement (repository vs environment)

A secret's **scope must match how the job that reads it is triggered**:

| A secret read by a job that…   | Scope           | Managed by                                                |
| ------------------------------ | --------------- | --------------------------------------------------------- |
| declares `environment: <name>` | **Environment** | `pnpm github:sync` (from `.env.<environment>`)            |
| declares **no** `environment:` | **Repository**  | **manual** — `gh secret set <NAME> --repo …` (no `--env`) |

Deploy/build values (`NETLIFY_*`, `VITE_*`) are read by the environment-gated
deploy job → **environment secrets** (github:sync uploads them). CI/automation
tokens read by **ungated** jobs → **repository secrets** (set by hand).

Today the only repository secret is **`RELEASE_PLEASE_TOKEN`** — read ungated by
`release-please`, the `pat-canary`, and `dependabot-auto-merge`:

```bash
gh secret set RELEASE_PLEASE_TOKEN --repo nikunjmavani/core-fe   # NO --env
```

Use a fine-grained PAT scoped to this repo (Contents + Pull requests + Workflows,
read/write). `github:sync` does **not** manage repository secrets — add any future
ones (Slack webhook, Codecov/Stryker/npm token, …) the same manual way.

## Commands

| Command                           | Purpose                                                                     |
| --------------------------------- | --------------------------------------------------------------------------- |
| `pnpm github:sync`                | Scaffold `.env.*`, sync rulesets, ensure env shells, push secrets           |
| `pnpm github:sync --check`        | Read-only drift (rulesets, shells, protection, secret names) — fails on any |
| `pnpm github:sync --dry-run`      | Preview changes, no writes                                                  |
| `pnpm github:sync --yes`          | Skip the secrets-push confirmation (automation)                             |
| `pnpm github:sync --prune`        | Flag rulesets for branches not in config (`--prune --yes` to delete)        |
| `pnpm validate:deploy-env`        | Fail if required deploy secrets missing (local, uses GitHub API)            |
| `pnpm setup:infra:github-secrets` | Legacy: push from `config.setup.env`                                        |

Every `github:sync` (all modes) runs a **consistency pre-flight** first: the
environments in `setup.config.json`, `.github/environments/*.json`, and the
reusable deploy workflow must agree, and `git.protectedBranches` / `defaultBranch`
must match the committed `.github/rulesets/*.json` (single trunk = `main` only).
It fails fast on drift before touching GitHub.

## Governance mode (personal ↔ team)

The production environment's `requiredReviewers` (`users` + `preventSelfReview`)
is one half of the repo's branch-governance mode; the trunk ruleset's
`pull_request` rule is the other. Do not edit them by hand — the coupled review
fields deadlock the maintainer in the wrong combination. Switch both atomically:

```bash
pnpm github:tool:governance-mode          # status
pnpm github:tool:governance-mode team     # four-eyes (needs ≥2 CODEOWNERS users)
pnpm github:sync                          # apply to GitHub
```

Full reference: [docs/reference/branch-governance.md](../../docs/reference/branch-governance.md).

## Protection drift

GitHub does not expose a full “apply protection from JSON” API for all fields.
When [`production.json`](production.json) specifies required reviewers or branch
policies, apply them in **Settings → Environments → production** to match the
committed file, then run `pnpm github:sync --check`.

## CI

[`reusable-netlify-deploy.yml`](../workflows/reusable-netlify-deploy.yml) runs
`validate-github-env.mjs` with `GITHUB_ENV_VALIDATION_SOURCE=runtime` so missing
secrets fail the deploy job instead of skipping quietly.
