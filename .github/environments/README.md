# GitHub Environments (IaC)

Committed JSON under this directory describes **GitHub Environment protection**
(reviewers, deployment branch policy). Deploy **secrets** live in GitHub
Environments and are synced from gitignored `.env.development` /
`.env.production` at the repo root (or from `config.setup.env` via the legacy
path).

## Mapping

| Branch | GitHub Environment | Local secrets file |
| ------ | ------------------ | ------------------ |
| `dev`  | `development`      | `.env.development` |
| `main` | `production`       | `.env.production`  |

Canonical manifest: [`tooling/setup/setup.config.json`](../../tooling/setup/setup.config.json).

## Required deploy secrets

These must be present or post-merge Netlify deploy **fails** (no silent skip):

- `VITE_API_BASE_URL`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Optional (warn only): `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_PRIVACY_POLICY_URL`.

## Commands

| Command                             | Purpose                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `pnpm github:sync`                  | Scaffold `.env.*`, sync rulesets, ensure env shells, push secrets |
| `pnpm github:sync --check`          | Read-only drift (rulesets, shells, protection, secret names)      |
| `pnpm github:sync --dry-run`        | Preview changes                                                   |
| `pnpm validate:github-env`          | Fail if required deploy secrets missing (local, uses GitHub API)  |
| `pnpm validate:github-environments` | Fail if protection drift vs committed JSON                        |
| `pnpm setup:infra:github-secrets`   | Legacy: push from `config.setup.env`                              |

## Protection drift

GitHub does not expose a full “apply protection from JSON” API for all fields.
When [`production.json`](production.json) specifies required reviewers or branch
policies, apply them in **Settings → Environments → production** to match the
committed file, then run `pnpm validate:github-environments`.

## CI

[`reusable-netlify-deploy.yml`](../workflows/reusable-netlify-deploy.yml) runs
`validate-github-env.mjs` with `GITHUB_ENV_VALIDATION_SOURCE=runtime` so missing
secrets fail the deploy job instead of skipping quietly.
