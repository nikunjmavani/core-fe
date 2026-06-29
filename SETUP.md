# Setup — from clone to running

End-to-end guide for **core-fe**. Two paths:

- **[Local development](#local-development)** — **core-be** on `:3000` (Vite proxies `/api`). One command: `pnpm setup:local`.
- **[Deploy / infra](#deploy)** — Netlify + GitHub secrets. One command: `pnpm setup`.

**Related:** [README.md](README.md) · [CLAUDE.md](CLAUDE.md) · [docs/getting-started/setup.md](docs/getting-started/setup.md) · [docs/README.md](docs/README.md)

---

## Local development

```bash
git clone <repo-url>
cd core-fe
pnpm setup:local
```

See [docs/getting-started/setup.md](docs/getting-started/setup.md) for flags, MCP setup, and env vars.

---

## Deploy

```bash
pnpm setup          # Netlify + GitHub secrets + deploy
pnpm setup:check    # validate state
pnpm github:sync    # GitHub environments + rulesets
```

See [tooling/setup/live/README.md](tooling/setup/live/README.md) and [docs/deployment/netlify-cli-setup.md](docs/deployment/netlify-cli-setup.md).
