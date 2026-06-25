# Scripts

Scripts used for local setup, validation, and CI. Run from project root (e.g. `pnpm run validate:env-example` or `./scripts/setup/github-secrets.sh`).

## Layout

```text
scripts/
├── README.md
├── required-env.txt           # Required env var names for .env.example
├── live/                      # One-command deployment (pnpm run setup)
│   ├── index.mjs              # Orchestrator: setup | check | revert
│   ├── config.mjs             # Load config.setup.env
│   ├── netlify.mjs            # Netlify API client
│   ├── github.mjs             # GitHub secrets via gh
│   └── README.md
├── setup/
│   ├── github-secrets.sh      # Sync deploy + cookie-banner vars to GitHub Environments
│   └── netlify.sh             # link Netlify site, set prod env, deploy via CLI
└── validate/
    ├── env-example.sh         # ensure .env.example documents all required vars
    ├── health-check.sh        # full project health check (all phases)
    ├── public-assets.sh       # ensure required public/ assets exist
    └── route-islands.sh       # route-island shape + <PAGE>.OVERVIEW.md references resolve
```

## Commands

Run via `pnpm` scripts (preferred) or directly.

| Command                               | Purpose                                                                                                                                             | When it runs                                                         |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm run validate:env-example`       | Ensures every required env var from `scripts/required-env.txt` is documented in `.env.example`.                                                     | Pre-commit, CI (`validate-env-example` job).                         |
| `pnpm run validate:public`            | Ensures required files exist in `public/` (manifest, robots.txt, etc.); warns if PWA icons missing.                                                 | Local or CI (`validate-public` job).                                 |
| `pnpm run validate:structure`         | Ensures every route island has its manifest, <PAGE>.OVERVIEW.md, and top-level UI, and that all <PAGE>.OVERVIEW.md path references resolve on disk. | Local, `pnpm health` (Phase 9), or CI.                               |
| `pnpm health`                         | Full health check: format, lint, types, tests, build, size, env, public, structure.                                                                 | Manual after major changes; CI-ready.                                |
| `pnpm health:fix`                     | Auto-fix format + lint, then run full health check.                                                                                                 | Manual before PR.                                                    |
| `pnpm run setup:infra:github-secrets` | Syncs `VITE_API_BASE_URL`, PostHog, privacy URL, and Netlify secrets to GitHub Environments (`development`, `production`) from `config.setup.env`.  | One-time or when env changes; requires `gh auth login`.              |
| `pnpm run setup:infra:netlify`        | Links Netlify site (if needed), sets production env vars, and deploys via CLI.                                                                      | One-time or manual deploy; see docs/deployment/netlify-cli-setup.md. |
| `pnpm run setup`                      | Full provisioning: Netlify + GitHub secrets + deploy.                                                                                               | Aligned with backend; see `scripts/live/README.md`.                  |
| `pnpm run setup:check`                | Validate state + health (Netlify, GitHub).                                                                                                          | Before or after setup.                                               |
| `pnpm run setup:revert:all`           | Tear down everything: GitHub secrets, Netlify sites.                                                                                                | Before re-running setup or to reset.                                 |

**Package.json scripts** map to the shell scripts under `scripts/setup/` and `scripts/validate/`; prefer running them through `pnpm run` so any future path changes don't break your commands.
