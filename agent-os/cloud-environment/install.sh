#!/usr/bin/env bash
# Cached cloud-agent install for core-fe — idempotent; safe to run on every VM
# boot/update. Installs the Node toolchain + JS deps + the default MCP pair, and
# scaffolds a dev env file. It does NOT install Playwright browsers or start any
# service — those are on-demand (see agent-os/cloud-environment/agents-cloud.md),
# so a browser-download or backend failure never marks the environment as failed.
#
# Usage (Cursor environment.json install field or dashboard Setup script):
#   bash agent-os/cloud-environment/install.sh
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repository_root}"

log() { printf 'cloud-install: %s\n' "$*" >&2; }

# Node — pin the major from .nvmrc (24). Cloud images usually ship a Node; if a
# version manager is present, use it, otherwise rely on the session Node (the
# engines gate in package.json enforces the major at install time). Best-effort.
node_major="$(tr -dc '0-9' <.nvmrc 2>/dev/null || true)"
node_major="${node_major:-24}"
if command -v fnm >/dev/null 2>&1; then
  fnm use "${node_major}" --install-if-missing || log "fnm use ${node_major} failed — using session Node"
elif command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090
  nvm install "${node_major}" || log "nvm install ${node_major} failed — using session Node"
fi

# pnpm via corepack (packageManager pin in package.json).
corepack enable 2>/dev/null || log "corepack enable failed — ensure pnpm is on PATH"

log "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

# Default MCP pair (codegraph + headroom) → .mcp.json, same as local pnpm setup:local.
# Both binaries are devDependencies, so they resolve after install. Best-effort.
log "scaffold MCP default pair (.mcp.json)"
pnpm mcp:setup:default || log "mcp:setup:default failed — run it manually if MCP tools are missing"

# Scaffold .env.development for later `pnpm dev` (schema defaults; no secrets committed).
log "scaffold .env.development"
pnpm setup:local || log "setup:local skipped — .env.development may already exist"

log "done — lint / type-check / unit tests / pnpm agent-os:check run cold."
log "     Playwright e2e needs browsers (pnpm exec playwright install --with-deps chromium)"
log "     and core-be on :3000 — see agent-os/cloud-environment/agents-cloud.md."
log "     The chrome-devtools MCP reuses that same Playwright Chromium (pnpm mcp:setup chrome-devtools)."
