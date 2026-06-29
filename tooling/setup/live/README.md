# Live Automation

One-command deployment: create all environments (Netlify, GitHub secrets) and go live.

## Prerequisites

1. **config.setup.env** — Edit with your values:
   - `SETUP_PROJECT_NAME` — Project slug (e.g. `core-fe`)
   - `SETUP_ORG_NAME` — Netlify team slug (from app.netlify.com/teams/**&lt;slug&gt;**/sites)
   - `NODE_VERSION` — Required; major version for CI and Netlify (e.g. `24`), must match `package.json` `engines.node`
   - `SETUP_ENVS` — Comma-separated: `dev,main` or `dev,main,preview` (matches core-be branch model)
   - Per-env API URLs: `VITE_API_BASE_URL_PROD`, `VITE_API_BASE_URL_DEV`, etc.

2. **Tokens** (set once, never commit):
   - `NETLIFY_AUTH_TOKEN` — Netlify → User settings → Applications → Personal access tokens

3. **GitHub** (optional) — Run `gh auth login` to set GitHub secrets automatically.

## Commands (aligned with backend)

| Command                     | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `pnpm run setup`            | Full provisioning: Netlify → GitHub secrets → deploy                    |
| `pnpm run setup:check`      | Validate state + health (Netlify sites, GitHub auth)                    |
| `pnpm run setup:revert:all` | Revert chosen env (dev \| main \| all) across all services — no partial |

## Flow (setup and revert — same UX)

1. **Choose env** — dev | main | all
2. **Show summary** — What will be created (setup) or removed (revert)
3. **Confirmation** — Type "yes" to proceed
4. **Existing check** (setup only) — If conflicts, recommend revert first
5. **Netlify** — Create sites per env, set env vars
6. **GitHub** — Set secrets on GitHub Environments (`development` for `dev`, `production` for `main`): `VITE_API_BASE_URL`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
7. **Deploy** — `pnpm build` + `netlify deploy --prod`

**On failure:** Rollback removes created resources (no partial state). Run `setup:revert:all` and choose env to revert.

## Config mapping

| Branch / SETUP_ENVS | GitHub Environment | Netlify site        |
| ------------------- | ------------------ | ------------------- |
| dev                 | `development`      | `{project}-dev`     |
| main                | `production`       | `{project}-main`    |
| preview             | —                  | `{project}-preview` |

Override site names: `NETLIFY_SITE_MAIN`, `NETLIFY_SITE_DEV`, etc.

Canonical manifest: [`tooling/setup/setup.config.json`](../setup/setup.config.json).
