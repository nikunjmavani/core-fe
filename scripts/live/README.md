# Live Automation

One-command deployment: create all environments (Netlify, GitHub secrets) and go live.

## Prerequisites

1. **config.setup.env** — Edit with your values:
   - `SETUP_PROJECT_NAME` — Project slug (e.g. `core-fe`)
   - `SETUP_ORG_NAME` — Netlify team slug (from app.netlify.com/teams/**&lt;slug&gt;**/sites)
   - `NODE_VERSION` — Required; major version for CI and Netlify (e.g. `24`), must match `package.json` `engines.node`
   - `SETUP_ENVS` — Comma-separated: `dev,qa,main` or `dev,qa,main,preview`
   - Per-env API URLs: `VITE_API_BASE_URL_PROD`, `VITE_API_BASE_URL_DEV`, etc.

2. **Tokens** (set once, never commit):
   - `NETLIFY_AUTH_TOKEN` — Netlify → User settings → Applications → Personal access tokens

3. **GitHub** (optional) — Run `gh auth login` to set GitHub secrets automatically.

## Commands (aligned with backend)

| Command                     | Purpose                                              |
| --------------------------- | ---------------------------------------------------- | --- | ---- | ------------------------------------- |
| `pnpm run setup`            | Full provisioning: Netlify → GitHub secrets → deploy |
| `pnpm run setup:check`      | Validate state + health (Netlify sites, GitHub auth) |
| `pnpm run setup:revert:all` | Revert chosen env (dev                               | qa  | main | all) across all services — no partial |

## Flow (setup and revert — same UX)

1. **Choose env** — dev | qa | main | all
2. **Show summary** — What will be created (setup) or removed (revert)
3. **Confirmation** — Type "yes" to proceed
4. **Existing check** (setup only) — If conflicts, recommend revert first
5. **Netlify** — Create sites per env, set env vars
6. **GitHub** — Set `VITE_API_BASE_URL`, `NODE_VERSION`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
7. **Deploy** — `pnpm build` + `netlify deploy --prod`

**On failure:** Rollback removes created resources (no partial state). Run `setup:revert:all` and choose env to revert.

## Config mapping

| SETUP_ENVS | Netlify site        |
| ---------- | ------------------- |
| dev        | `{project}-dev`     |
| qa         | `{project}-qa`      |
| main       | `{project}-main`    |
| preview    | `{project}-preview` |

Override site names: `NETLIFY_SITE_MAIN`, `NETLIFY_SITE_DEV`, etc.
